import networkx as nx
from typing import Dict, Any, List, Tuple
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.tender import Tender
from app.models.company import Company
from app.models.participation import TenderParticipation


class ProcurementGraphBuilder:
    """
    Constructs multi-relational procurement graphs from PostgreSQL data.
    
    Graph Topology:
    - Nodes:
        - Type 'tender': attributes {id, tender_id, title, category, estimated_value, status}
        - Type 'company': attributes {id, company_id, name, city, country}
    - Edges:
        - (company, tender): relation='PARTICIPATED_IN', attributes {quoted_price, result, qualification}
        - (company_A, company_B): relation='CO_BIDDER', attributes {shared_tenders, similar_prices, weight}
    """

    def __init__(self, db: Session):
        self.db = db

    def build_full_procurement_graph(self) -> nx.Graph:
        """
        Builds the complete global procurement bipartite & co-bidding network.
        """
        G = nx.Graph()

        # 1. Add active tenders as nodes
        tenders = self.db.query(Tender).filter(Tender.is_deleted == False).all()
        for t in tenders:
            G.add_node(
                f"T_{t.id}",
                node_type="tender",
                tender_id=t.tender_id,
                title=t.title,
                category=t.category,
                estimated_value=float(t.estimated_value),
                status=t.status,
            )

        # 2. Add active companies as nodes
        companies = self.db.query(Company).filter(Company.is_deleted == False).all()
        for c in companies:
            G.add_node(
                f"C_{c.id}",
                node_type="company",
                company_id=c.company_id,
                name=c.company_name,
                city=c.city,
                country=c.country,
            )

        # 3. Add participation edges (Company -> Tender)
        participations = (
            self.db.query(TenderParticipation)
            .join(Tender, TenderParticipation.tender_id == Tender.id)
            .filter(Tender.is_deleted == False)
            .all()
        )
        
        # Track co-bidding pairs
        tender_bidders: Dict[int, List[Tuple[int, float, str]]] = {}

        for p in participations:
            t_node = f"T_{p.tender_id}"
            c_node = f"C_{p.company_id}"
            if G.has_node(t_node) and G.has_node(c_node):
                G.add_edge(
                    c_node,
                    t_node,
                    relation="PARTICIPATED_IN",
                    quoted_price=float(p.quoted_price),
                    result=p.participation_result,
                    qualification=p.qualification_status,
                )
                if p.tender_id not in tender_bidders:
                    tender_bidders[p.tender_id] = []
                tender_bidders[p.tender_id].append((p.company_id, float(p.quoted_price), p.participation_result))

        # 4. Add co-bidding projections between companies (Company <-> Company)
        pair_counts: Dict[Tuple[int, int], int] = {}
        for t_id, bidders in tender_bidders.items():
            if len(bidders) < 2:
                continue
            for i in range(len(bidders)):
                for j in range(i + 1, len(bidders)):
                    c1, _, _ = bidders[i]
                    c2, _, _ = bidders[j]
                    pair = (min(c1, c2), max(c1, c2))
                    pair_counts[pair] = pair_counts.get(pair, 0) + 1

        for (c1, c2), count in pair_counts.items():
            c1_node = f"C_{c1}"
            c2_node = f"C_{c2}"
            if G.has_node(c1_node) and G.has_node(c2_node):
                G.add_edge(
                    c1_node,
                    c2_node,
                    relation="CO_BIDDER",
                    weight=count,
                    shared_tenders=count,
                )

        return G

    def build_tender_subgraph(self, tender_id: int) -> nx.Graph:
        """
        Builds ego-network subgraph around a specific tender, including its
        bidders, their bids, and historical co-bidding links between those bidders.
        """
        full_G = self.build_full_procurement_graph()
        target_node = f"T_{tender_id}"
        if not full_G.has_node(target_node):
            return nx.Graph()

        # Find 1-hop neighbors (the participating companies)
        neighbors = list(full_G.neighbors(target_node))
        
        # Subgraph contains the tender, its participating companies, and any co-bidding edges between them
        sub_nodes = set([target_node] + neighbors)
        sub_G = full_G.subgraph(sub_nodes).copy()
        return sub_G

    def extract_graph_metrics(self, G: nx.Graph) -> Dict[str, Any]:
        """
        Extracts structural network metrics suitable for audit documentation and GNN embedding.
        """
        if G.number_of_nodes() == 0:
            return {"nodes": 0, "edges": 0, "density": 0.0, "components": 0}

        return {
            "total_nodes": G.number_of_nodes(),
            "total_edges": G.number_of_edges(),
            "density": round(nx.density(G), 4),
            "connected_components": nx.number_connected_components(G),
        }
