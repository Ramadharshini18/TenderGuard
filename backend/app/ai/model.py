import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import Dict, Any


class ProcurementGraphSAGE(nn.Module):
    """
    Graph Neural Network model architecture (GraphSAGE inspired) using pure PyTorch.
    Operates on bipartite and co-bidding graphs without external heavyweight dependencies.
    
    Structure:
    - Linear projection layer for node features (tender & company feature vectors)
    - 2-hop message-passing neighborhood aggregation layer
    - Multi-layer perceptron (MLP) classification / embedding head
    """

    def __init__(self, in_features: int = 16, hidden_dim: int = 32, out_dim: int = 16):
        super(ProcurementGraphSAGE, self).__init__()
        self.in_features = in_features
        self.hidden_dim = hidden_dim
        self.out_dim = out_dim

        # Input transformation
        self.node_proj = nn.Linear(in_features, hidden_dim)
        
        # Message Passing Layer 1
        self.agg_weight_1 = nn.Linear(hidden_dim * 2, hidden_dim)
        
        # Message Passing Layer 2
        self.agg_weight_2 = nn.Linear(hidden_dim * 2, out_dim)
        
        # Output scoring head
        self.classifier = nn.Sequential(
            nn.Linear(out_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 1),
            nn.Sigmoid()
        )

    def forward(self, x: torch.Tensor, adj: torch.Tensor) -> torch.Tensor:
        """
        x: [num_nodes, in_features]
        adj: normalized adjacency matrix [num_nodes, num_nodes]
        """
        h = F.relu(self.node_proj(x))
        
        # Layer 1 neighborhood aggregation
        neigh_h_1 = torch.matmul(adj, h)
        combined_1 = torch.cat([h, neigh_h_1], dim=-1)
        h_1 = F.relu(self.agg_weight_1(combined_1))
        
        # Layer 2 neighborhood aggregation
        neigh_h_2 = torch.matmul(adj, h_1)
        combined_2 = torch.cat([h_1, neigh_h_2], dim=-1)
        h_2 = F.relu(self.agg_weight_2(combined_2))
        
        # Final logits
        logits = self.classifier(h_2)
        return logits
