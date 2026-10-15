from datetime import date, timedelta
from contextlib import asynccontextmanager
from decimal import Decimal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, SessionLocal, Base, check_database_connectivity
from app.models.user import User
from app.models.tender import Tender
from app.models.company import Company
from app.models.participation import TenderParticipation
from app.routes.api_router import api_v1_router
from app.routes.auth import router as auth_router
from app.routes.tenders import router as tenders_router
from app.routes.companies import router as companies_router
from app.routes.participations import router as participations_router
from app.routes.patterns import router as patterns_router
from app.routes.risk_analysis import router as risk_analysis_router
from app.routes.reports import router as reports_router
from app.schemas.common import HealthCheckResponse, DatabaseStatus
from app.utils.logger import setup_logger
from app.utils.security import hash_password

logger = setup_logger("tenderguard.main")


DEMO_TENDERS_SEED = [
    {
        "tender_id": "TND-DEMO-001",
        "title": "Metro Transit System Automated Signaling Upgrade",
        "description": "[Demonstration Record] Complete signaling hardware and SCADA communication network overhaul across central rapid transit lines.",
        "category": "Transportation",
        "sub_category": "Rail Signaling & Automation",
        "procurement_authority": "Metropolitan Public Transit Authority",
        "location": "Central Metro District",
        "estimated_value": Decimal("14250000.00"),
        "currency": "USD",
        "publication_date": date.today() - timedelta(days=20),
        "submission_deadline": date.today() + timedelta(days=25),
        "opening_date": date.today() + timedelta(days=27),
        "status": "Published",
    },
    {
        "tender_id": "TND-DEMO-002",
        "title": "Regional Medical Equipment Procurement & Diagnostic Imaging",
        "description": "[Demonstration Record] High-field MRI and automated CT scanner acquisition for three regional public hospital facilities.",
        "category": "Healthcare & Medical Supplies",
        "sub_category": "Diagnostic Radiology Equipment",
        "procurement_authority": "Ministry of Public Health & Sanitation",
        "location": "Northern Medical Zone",
        "estimated_value": Decimal("4100000.00"),
        "currency": "USD",
        "publication_date": date.today() - timedelta(days=15),
        "submission_deadline": date.today() + timedelta(days=18),
        "opening_date": date.today() + timedelta(days=20),
        "status": "Published",
    },
    {
        "tender_id": "TND-DEMO-003",
        "title": "Educational Cloud Infrastructure & State Data Lake",
        "description": "[Demonstration Record] Sovereign hybrid-cloud deployment supporting student information systems across state universities.",
        "category": "Information Technology",
        "sub_category": "Enterprise Cloud Architecture",
        "procurement_authority": "Department of Higher Education & Innovation",
        "location": "State Capital",
        "estimated_value": Decimal("8900000.00"),
        "currency": "USD",
        "publication_date": date.today() - timedelta(days=35),
        "submission_deadline": date.today() - timedelta(days=5),
        "opening_date": date.today() - timedelta(days=3),
        "status": "Under Evaluation",
    },
    {
        "tender_id": "TND-DEMO-004",
        "title": "Municipal Water Treatment Facility Rehabilitation",
        "description": "[Demonstration Record] Mechanical filtration replacement and biological treatment reactor expansion for municipal water authority.",
        "category": "Public Utilities",
        "sub_category": "Potable Water Treatment",
        "procurement_authority": "Municipal Water & Sanitation Board",
        "location": "Western River Basin",
        "estimated_value": Decimal("22500000.00"),
        "currency": "USD",
        "publication_date": date.today() - timedelta(days=60),
        "submission_deadline": date.today() - timedelta(days=10),
        "opening_date": date.today() - timedelta(days=8),
        "status": "Awarded",
    },
    {
        "tender_id": "TND-DEMO-005",
        "title": "Provincial Highway Asphalt Resurfacing Segment 4",
        "description": "[Demonstration Record] High-durability asphalt resurfacing, guardrail replacement, and seismic bridge joint retrofitting.",
        "category": "Civil Works",
        "sub_category": "Highway Engineering",
        "procurement_authority": "Provincial Department of Transportation",
        "location": "Highway Corridor 4B",
        "estimated_value": Decimal("11800000.00"),
        "currency": "USD",
        "publication_date": date.today() - timedelta(days=5),
        "submission_deadline": date.today() + timedelta(days=40),
        "opening_date": date.today() + timedelta(days=42),
        "status": "Published",
    },
]

DEMO_COMPANIES_SEED = [
    {
        "company_id": "COMP-001",
        "company_name": "ABC Infrastructure Pvt Ltd",
        "registration_number": "REG-45821",
        "contact_email": "tenders@abcinfra.com",
        "contact_phone": "+91 98200 11223",
        "address": "401 Corporate Park, Bandra Kurla Complex",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
    },
    {
        "company_id": "COMP-002",
        "company_name": "XYZ Builders & Contractors Ltd",
        "registration_number": "REG-98102",
        "contact_email": "contracts@xyzbuilders.com",
        "contact_phone": "+91 98110 44556",
        "address": "12 Connaught Place Outer Circle",
        "city": "Delhi",
        "state": "Delhi",
        "country": "India",
    },
    {
        "company_id": "COMP-003",
        "company_name": "PQR Engineering Projects",
        "registration_number": "REG-33419",
        "contact_email": "bids@pqrengineering.in",
        "contact_phone": "+91 99801 77889",
        "address": "Plot 88 Electronics City Phase 1",
        "city": "Bengaluru",
        "state": "Karnataka",
        "country": "India",
    },
    {
        "company_id": "COMP-004",
        "company_name": "LMN Tech & Civil Works Corp",
        "registration_number": "REG-77201",
        "contact_email": "procurement@lmncorp.com",
        "contact_phone": "+91 94440 22334",
        "address": "55 Anna Salai Central Hub",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "country": "India",
    },
    {
        "company_id": "COMP-005",
        "company_name": "Zenith Bio-Medical Systems",
        "registration_number": "REG-12055",
        "contact_email": "director@zenithbiomed.com",
        "contact_phone": "+91 98490 66778",
        "address": "B-14 HITEC City Tech Enclave",
        "city": "Hyderabad",
        "state": "Telangana",
        "country": "India",
    },
]


def ensure_schema_and_seed():
    """Verifies database tables, seeds initial admin user, tenders, companies, and participations."""
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema initialized successfully.")

        db = SessionLocal()
        try:
            # 1. Admin account check
            admin_user = db.query(User).filter(User.email == settings.ADMIN_EMAIL.strip().lower()).first()
            if not admin_user:
                logger.info(f"Initial administrator not found. Provisioning {settings.ADMIN_EMAIL}...")
                admin_user = User(
                    name=settings.ADMIN_NAME,
                    email=settings.ADMIN_EMAIL.strip().lower(),
                    password_hash=hash_password(settings.ADMIN_PASSWORD),
                    role=settings.ADMIN_ROLE,
                    is_active=True
                )
                db.add(admin_user)
                db.commit()
                db.refresh(admin_user)
                logger.info(f"Initial administrator account '{settings.ADMIN_EMAIL}' created successfully.")
            else:
                logger.info(f"Administrator account '{settings.ADMIN_EMAIL}' is ready.")

            # 2. Demonstration tenders check
            tender_count = db.query(Tender).filter(Tender.is_deleted == False).count()
            if tender_count == 0:
                logger.info("No active tenders found. Provisioning clearly labeled demonstration tenders...")
                for item in DEMO_TENDERS_SEED:
                    t = Tender(
                        **item,
                        is_deleted=False,
                        created_by=admin_user.id,
                        updated_by=admin_user.id
                    )
                    db.add(t)
                db.commit()
                logger.info(f"Successfully seeded {len(DEMO_TENDERS_SEED)} demonstration tenders.")
            else:
                logger.info(f"Tender registry operational ({tender_count} active tenders).")

            # 3. Demonstration companies check
            company_count = db.query(Company).filter(Company.is_deleted == False).count()
            if company_count == 0:
                logger.info("No companies found. Provisioning baseline participating companies...")
                for c_item in DEMO_COMPANIES_SEED:
                    comp = Company(**c_item, is_deleted=False)
                    db.add(comp)
                db.commit()
                logger.info(f"Successfully seeded {len(DEMO_COMPANIES_SEED)} participating companies.")

            # 4. Demonstration participations check
            part_count = db.query(TenderParticipation).count()
            if part_count < 10:
                t1 = db.query(Tender).filter(Tender.tender_id == "TND-DEMO-001").first()
                t2 = db.query(Tender).filter(Tender.tender_id == "TND-DEMO-002").first()
                t3 = db.query(Tender).filter(Tender.tender_id == "TND-DEMO-003").first()
                t4 = db.query(Tender).filter(Tender.tender_id == "TND-DEMO-004").first()
                t5 = db.query(Tender).filter(Tender.tender_id == "TND-DEMO-005").first()

                comp1 = db.query(Company).filter(Company.company_id == "COMP-001").first()
                comp2 = db.query(Company).filter(Company.company_id == "COMP-002").first()
                comp3 = db.query(Company).filter(Company.company_id == "COMP-003").first()
                comp4 = db.query(Company).filter(Company.company_id == "COMP-004").first()

                if t1 and t2 and t3 and t4 and t5 and comp1 and comp2 and comp3 and comp4:
                    demo_participations = [
                        # Tender 1: ABC (Won), XYZ (Lost - similar 0.85%), PQR (Lost), LMN (Lost)
                        (t1.id, comp1.id, Decimal("11700000.00"), "Won", "Qualified", "Lowest responsive proposal"),
                        (t1.id, comp2.id, Decimal("11800000.00"), "Lost", "Qualified", "Second lowest responsive bid (0.85% difference)"),
                        (t1.id, comp3.id, Decimal("11750000.00"), "Lost", "Qualified", "Technically compliant bid"),
                        (t1.id, comp4.id, Decimal("13200000.00"), "Lost", "Qualified", "Compliant submission"),

                        # Tender 2: XYZ (Won), ABC (Lost - similar 1.25%), PQR (Lost) -> Alternating Winner!
                        (t2.id, comp2.id, Decimal("3950000.00"), "Won", "Qualified", "Awarded lowest responsive bid"),
                        (t2.id, comp1.id, Decimal("4000000.00"), "Lost", "Qualified", "Close runner-up (1.27% difference)"),
                        (t2.id, comp3.id, Decimal("4250000.00"), "Lost", "Qualified", "Above estimate"),

                        # Tender 3: ABC (Won), XYZ (Lost - similar 1.15%), LMN (Lost)
                        (t3.id, comp1.id, Decimal("8600000.00"), "Won", "Qualified", "Awarded cloud contract"),
                        (t3.id, comp2.id, Decimal("8700000.00"), "Lost", "Qualified", "Close runner-up (1.16% difference)"),
                        (t3.id, comp4.id, Decimal("9100000.00"), "Lost", "Qualified", "Evaluation score lower"),

                        # Tender 4: XYZ (Won), ABC (Lost - similar 0.9%), PQR (Lost) -> Alternating Winner!
                        (t4.id, comp2.id, Decimal("21800000.00"), "Won", "Qualified", "Lowest responsive water treatment bid"),
                        (t4.id, comp1.id, Decimal("22000000.00"), "Lost", "Qualified", "Runner-up bid (0.92% difference)"),
                        (t4.id, comp3.id, Decimal("22500000.00"), "Lost", "Qualified", "Within acceptable range"),

                        # Tender 5: ABC (Won), XYZ (Lost - similar 1.7%), PQR (Lost), LMN (Lost)
                        (t5.id, comp1.id, Decimal("11400000.00"), "Won", "Qualified", "Highway resurfacing awarded"),
                        (t5.id, comp2.id, Decimal("11600000.00"), "Lost", "Qualified", "Runner-up bid (1.75% difference)"),
                        (t5.id, comp3.id, Decimal("11500000.00"), "Lost", "Qualified", "Competitive price"),
                        (t5.id, comp4.id, Decimal("12100000.00"), "Lost", "Qualified", "Compliant submission"),
                    ]

                    for t_id, c_id, q_price, result, qual, note in demo_participations:
                        exists = db.query(TenderParticipation).filter(
                            TenderParticipation.tender_id == t_id,
                            TenderParticipation.company_id == c_id
                        ).first()
                        if not exists:
                            db.add(TenderParticipation(
                                tender_id=t_id,
                                company_id=c_id,
                                quoted_price=q_price,
                                currency="USD",
                                submission_date=date.today() - timedelta(days=10),
                                qualification_status=qual,
                                participation_result=result,
                                notes=note,
                            ))
                    db.commit()
                    logger.info("Successfully provisioned multi-tender demonstration bidding history.")
        finally:
            db.close()
    except Exception as e:
        logger.warning(f"Database schema or seeding note: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan context for startup and shutdown routines."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} in {settings.APP_ENV} mode...")
    
    # Initialize schema and seed data
    ensure_schema_and_seed()
    
    # Inspect database connectivity
    db_state = check_database_connectivity()
    logger.info(f"Database Connectivity Status: {db_state['status']} - {db_state['message']}")
    
    yield
    logger.info(f"Shutting down {settings.APP_NAME}...")


# FastAPI Application Instance
app = FastAPI(
    title="TenderGuard API",
    description=(
        "Smart Tender Fraud Risk Detection System Using Graph Neural Networks "
        "for E-Procurement Platform Monitoring. Backend REST API Foundation."
    ),
    version=settings.APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Standardized CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(
    "/api/health",
    response_model=HealthCheckResponse,
    tags=["Health"],
    summary="Root Health Check",
    description="Returns the operational health of TenderGuard services and database connectivity."
)
def root_health_check() -> HealthCheckResponse:
    """Explicit GET /api/health endpoint required by specification."""
    db_status = check_database_connectivity()
    return HealthCheckResponse(
        status="healthy",
        app_name=settings.APP_NAME,
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        database=DatabaseStatus(**db_status)
    )


@app.get(
    "/",
    tags=["Root"],
    summary="Platform Status Root",
    description="Welcome metadata for TenderGuard E-Procurement Fraud Detection Platform."
)
def root():
    return {
        "platform": settings.APP_NAME,
        "description": "Smart Tender Fraud Risk Detection System Using Graph Neural Networks",
        "system": "Smart Tender Fraud Risk Detection & Oversight Platform",
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health_check": "/api/health"
    }


# Include Versioned API Routers (/api/v1/...)
app.include_router(api_v1_router, prefix=settings.API_V1_PREFIX)

# Also expose routers under /api for root compatibility
app.include_router(auth_router, prefix="/api")
app.include_router(tenders_router, prefix="/api")
app.include_router(companies_router, prefix="/api")
app.include_router(participations_router, prefix="/api")
app.include_router(patterns_router, prefix="/api")
app.include_router(risk_analysis_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
