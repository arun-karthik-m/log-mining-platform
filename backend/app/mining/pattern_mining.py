"""Pattern mining module for discovering frequent event sequences.

Implements:
- FP-Growth algorithm for frequent pattern mining
- Association rule generation
- Support and confidence calculation
"""

from typing import Any, Optional

import numpy as np
from mlxtend.frequent_patterns import fpgrowth
from pandas import DataFrame

from utils.logger import setup_logger

logger = setup_logger(__name__)


class PatternMiner:
    """Frequent pattern miner using FP-Growth algorithm."""

    def __init__(self, min_support: float = 0.1) -> None:
        """Initialize pattern miner.

        Args:
            min_support: Minimum support threshold (0-1).
        """
        self.min_support = min_support
        self._frequent_itemsets: Optional[DataFrame] = None
        self._rules: Optional[DataFrame] = None

    def fit(self, sequences: list[list[str]]) -> "PatternMiner":
        """Fit the miner on event sequences.

        Args:
            sequences: List of event sequences.

        Returns:
            Self for method chaining.
        """
        if not sequences:
            logger.warning("No sequences provided for pattern mining")
            return self

        self._num_sequences = len(sequences)

        # Convert sequences to one-hot encoded DataFrame
        df = self._sequences_to_dataframe(sequences)

        # Apply FP-Growth
        self._frequent_itemsets = fpgrowth(
            df,
            min_support=self.min_support,
            use_colnames=True,
        )

        logger.info(f"Found {len(self._frequent_itemsets)} frequent itemsets")
        return self

    def get_frequent_patterns(
        self,
        min_confidence: Optional[float] = None,
    ) -> list[dict[str, Any]]:
        """Get discovered frequent patterns.

        Args:
            min_confidence: Optional minimum confidence threshold for rules.

        Returns:
            List of pattern dictionaries with support/confidence.
        """
        if self._frequent_itemsets is None or self._frequent_itemsets.empty:
            return []

        patterns = []

        for _, row in self._frequent_itemsets.iterrows():
            pattern = {
                "items": list(row["itemsets"]),
                "support": float(row["support"]),
                "frequency": max(1, int(row["support"] * self._num_sequences)),
            }

            # Add confidence if rules were computed
            if min_confidence is not None and self._rules is not None:
                matching_rules = self._rules[
                    self._rules["antecedents"].apply(
                        lambda x: set(x) == set(pattern["items"])
                    )
                ]
                if not matching_rules.empty:
                    pattern["confidence"] = float(matching_rules["confidence"].iloc[0])

            patterns.append(pattern)

        return patterns

    def generate_association_rules(
        self,
        min_confidence: float = 0.5,
    ) -> list[dict[str, Any]]:
        """Generate association rules from frequent itemsets.

        Args:
            min_confidence: Minimum confidence threshold.

        Returns:
            List of association rule dictionaries.
        """
        from mlxtend.frequent_patterns import association_rules

        if self._frequent_itemsets is None or self._frequent_itemsets.empty:
            logger.warning("No frequent itemsets. Call fit() first.")
            return []

        # Generate rules
        self._rules = association_rules(
            self._frequent_itemsets,
            metric="confidence",
            min_threshold=min_confidence,
        )

        rules = []
        for _, row in self._rules.iterrows():
            rule = {
                "antecedents": list(row["antecedents"]),
                "consequents": list(row["consequents"]),
                "support": float(row["support"]),
                "confidence": float(row["confidence"]),
                "lift": float(row["lift"]),
                "conviction": float(row["conviction"]),
            }
            rules.append(rule)

        logger.info(f"Generated {len(rules)} association rules")
        return rules

    def _sequences_to_dataframe(self, sequences: list[list[str]]) -> DataFrame:
        """Convert sequences to one-hot encoded DataFrame.

        Args:
            sequences: List of event sequences.

        Returns:
            One-hot encoded DataFrame.
        """
        # Get all unique events
        all_events = set()
        for seq in sequences:
            all_events.update(seq)

        # Create one-hot encoding
        data = []
        for seq in sequences:
            row = {event: (1 if event in seq else 0) for event in all_events}
            data.append(row)

        return DataFrame(data)

    def get_statistics(self) -> dict[str, Any]:
        """Get mining statistics.

        Returns:
            Dictionary with statistics.
        """
        if self._frequent_itemsets is None or self._frequent_itemsets.empty:
            return {
                "total_patterns": 0,
                "avg_support": 0,
                "max_support": 0,
                "min_support": 0,
            }

        supports = self._frequent_itemsets["support"]

        return {
            "total_patterns": len(self._frequent_itemsets),
            "avg_support": float(supports.mean()),
            "max_support": float(supports.max()),
            "min_support": float(supports.min()),
        }


def mine_frequent_patterns(
    sequences: list[list[str]],
    min_support: float = 0.1,
    min_confidence: float = 0.5,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Mine frequent patterns and generate association rules.

    This is a stateless function for pure functional usage.

    Args:
        sequences: List of event sequences.
        min_support: Minimum support threshold.
        min_confidence: Minimum confidence threshold.

    Returns:
        Tuple of (patterns, rules).
    """
    miner = PatternMiner(min_support=min_support)
    miner.fit(sequences)

    patterns = miner.get_frequent_patterns()
    rules = miner.generate_association_rules(min_confidence=min_confidence)

    return patterns, rules


def extract_event_sequences(logs: list[dict[str, Any]]) -> list[list[str]]:
    """Extract event sequences from logs.

    Groups logs by session and extracts event sequences.

    Args:
        logs: List of log dictionaries.

    Returns:
        List of event sequences.
    """
    from collections import defaultdict

    # Group logs by session
    sessions: dict[Any, list[dict[str, Any]]] = defaultdict(list)

    for log in logs:
        session_id = log.get("session_id", "default")
        sessions[session_id].append(log)

    # Extract sequences from each session
    sequences = []
    for session_id, session_logs in sessions.items():
        # Sort by timestamp
        sorted_logs = sorted(
            session_logs,
            key=lambda x: x.get("timestamp", ""),
        )

        # Extract event types
        sequence = []
        for log in sorted_logs:
            # Create event type from level and message pattern
            level = log.get("level", "INFO")
            message = log.get("message", "")

            # Extract event type (e.g., "ERROR:Database", "INFO:Login")
            event_type = _extract_event_type(message)
            sequence.append(f"{level}:{event_type}")

        if sequence:
            sequences.append(sequence)

    logger.info(f"Extracted {len(sequences)} event sequences")
    return sequences


def _extract_event_type(message: str) -> str:
    """Extract event type from message.

    Args:
        message: Log message.

    Returns:
        Event type string.
    """
    message = message.lower()

    # Common event patterns
    if "login" in message or "auth" in message:
        return "Auth"
    if "logout" in message:
        return "Logout"
    if "search" in message or "query" in message:
        return "Search"
    if "error" in message or "fail" in message:
        return "Error"
    if "timeout" in message:
        return "Timeout"
    if "connect" in message:
        return "Connect"
    if "request" in message:
        return "Request"
    if "response" in message:
        return "Response"

    return "General"
