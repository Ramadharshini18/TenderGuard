"""
CLI and automated script to initialize the database and seed the first administrator.
Reads configurable credentials from environment variables or command-line arguments.
Usage:
    python seed_admin.py
    python seed_admin.py --email custom@gov.in --password MySecurePass --name "Director General"
"""
import argparse
import sys
import os

# Ensure backend root is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings
from app.database import engine, SessionLocal, Base
from app.models.user import User
from app.utils.security import hash_password


def seed_admin(email: str = None, password: str = None, name: str = None, role: str = None):
    print("=" * 60)
    print("  TenderGuard: Administrator Provisioning & Seeding")
    print("=" * 60)

    # 1. Ensure all database tables exist
    print("[1/3] Verifying database schema...")
    Base.metadata.create_all(bind=engine)
    print("      [OK] Database tables verified.")

    # 2. Determine target credentials from arguments or environment
    target_email = (email or settings.ADMIN_EMAIL).strip().lower()
    target_password = password or settings.ADMIN_PASSWORD
    target_name = (name or settings.ADMIN_NAME).strip()
    target_role = (role or settings.ADMIN_ROLE).strip()

    print(f"[2/3] Checking administrator record for: {target_email} ...")
    session = SessionLocal()
    try:
        existing_user = session.query(User).filter(User.email == target_email).first()
        if existing_user:
            print(f"      [OK] Administrator already exists: {existing_user.name} ({existing_user.email})")
            print("      Updating password hash with provided configuration...")
            existing_user.password_hash = hash_password(target_password)
            existing_user.name = target_name
            existing_user.role = target_role
            existing_user.is_active = True
            session.commit()
            print("      [OK] Administrator credentials successfully updated!")
        else:
            print("[3/3] Creating initial administrator account...")
            hashed_pw = hash_password(target_password)
            new_admin = User(
                name=target_name,
                email=target_email,
                password_hash=hashed_pw,
                role=target_role,
                is_active=True
            )
            session.add(new_admin)
            session.commit()
            print(f"      [OK] Successfully created administrator: {target_name} ({target_email})")
            
        print("\n[OK] Provisioning complete.")
        print(f"     Email: {target_email}")
        print(f"     Role:  {target_role}")
        print("=" * 60)
    except Exception as e:
        session.rollback()
        print(f"\n[ERROR] Failed to seed administrator: {e}")
        sys.exit(1)
    finally:
        session.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed or update TenderGuard administrator account.")
    parser.add_argument("--email", type=str, help="Administrator email address")
    parser.add_argument("--password", type=str, help="Administrator password")
    parser.add_argument("--name", type=str, help="Administrator full name")
    parser.add_argument("--role", type=str, help="User role (default: admin)")
    
    args = parser.parse_args()
    seed_admin(
        email=args.email,
        password=args.password,
        name=args.name,
        role=args.role
    )
