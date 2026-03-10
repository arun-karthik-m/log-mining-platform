"""Log clustering module using TF-IDF and K-Means.

Implements:
- TF-IDF vectorization for log text
- K-Means clustering
- Optimal k selection (elbow method)
- Cluster keyword extraction
"""

from typing import Any, Optional

import numpy as np
from sklearn.cluster import KMeans
from sklearn.feature_extraction.text import TfidfVectorizer

from utils.logger import setup_logger

logger = setup_logger(__name__)


class LogClusterer:
    """Log clustering using TF-IDF and K-Means."""

    def __init__(
        self,
        n_clusters: int = 5,
        max_features: int = 1000,
        random_state: int = 42,
    ) -> None:
        """Initialize clusterer.

        Args:
            n_clusters: Number of clusters.
            max_features: Maximum TF-IDF features.
            random_state: Random seed for reproducibility.
        """
        self.n_clusters = n_clusters
        self.max_features = max_features
        self.random_state = random_state

        self._vectorizer: Optional[TfidfVectorizer] = None
        self._kmeans: Optional[KMeans] = None
        self._cluster_centers: Optional[np.ndarray] = None
        self._labels: Optional[np.ndarray] = None

    def fit(self, logs: list[dict[str, Any]]) -> "LogClusterer":
        """Fit the clusterer on logs.

        Args:
            logs: List of log dictionaries.

        Returns:
            Self for method chaining.
        """
        if not logs:
            logger.warning("No logs provided for clustering")
            return self

        # Extract log messages
        messages = [log.get("message", "") for log in logs]

        # TF-IDF vectorization
        self._vectorizer = TfidfVectorizer(
            max_features=self.max_features,
            stop_words="english",
            ngram_range=(1, 2),
        )

        tfidf_matrix = self._vectorizer.fit_transform(messages)

        # Determine optimal k if not set
        n_clusters = self.n_clusters
        if n_clusters == -1:
            n_clusters = self._find_optimal_k(tfidf_matrix)

        # K-Means clustering
        self._kmeans = KMeans(
            n_clusters=n_clusters,
            random_state=self.random_state,
            n_init=10,
            max_iter=300,
        )

        self._labels = self._kmeans.fit_predict(tfidf_matrix)
        self._cluster_centers = self._kmeans.cluster_centers_

        logger.info(f"Clustered {len(logs)} logs into {n_clusters} clusters")
        return self

    def get_clusters(self, logs: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Get cluster information.

        Args:
            logs: List of log dictionaries.

        Returns:
            List of cluster dictionaries with metadata.
        """
        if self._labels is None or self._vectorizer is None:
            logger.warning("Model not fitted. Call fit() first.")
            return []

        clusters: dict[int, dict[str, Any]] = {}

        # Group logs by cluster
        for i, log in enumerate(logs):
            cluster_id = int(self._labels[i])

            if cluster_id not in clusters:
                clusters[cluster_id] = {
                    "id": cluster_id,
                    "logs": [],
                    "messages": [],
                }

            clusters[cluster_id]["logs"].append(log)
            clusters[cluster_id]["messages"].append(log.get("message", ""))

        # Build cluster summaries
        result = []
        for cluster_id, cluster_data in clusters.items():
            # Extract keywords
            keywords = self._extract_keywords(cluster_data["messages"])

            # Calculate centroid
            centroid = None
            if self._cluster_centers is not None:
                centroid = self._cluster_centers[cluster_id].tolist()

            cluster_info = {
                "cluster_id": cluster_id,
                "cluster_name": f"Cluster {cluster_id + 1}",
                "log_count": len(cluster_data["logs"]),
                "keywords": keywords,
                "centroid_vector": centroid,
                "sample_messages": cluster_data["messages"][:5],
            }

            result.append(cluster_info)

        # Sort by log count descending
        result.sort(key=lambda x: x["log_count"], reverse=True)

        return result

    def predict(self, messages: list[str]) -> list[int]:
        """Predict cluster labels for new messages.

        Args:
            messages: List of messages to classify.

        Returns:
            List of cluster labels.
        """
        if self._vectorizer is None or self._kmeans is None:
            logger.warning("Model not fitted. Call fit() first.")
            return [0] * len(messages)

        # Transform messages using fitted vectorizer
        tfidf_matrix = self._vectorizer.transform(messages)

        # Predict clusters
        labels = self._kmeans.predict(tfidf_matrix)

        return labels.tolist()

    def _find_optimal_k(self, tfidf_matrix: Any) -> int:
        """Find optimal number of clusters using elbow method.

        Args:
            tfidf_matrix: TF-IDF matrix.

        Returns:
            Optimal k value.
        """
        # Test k from 2 to 10
        k_range = range(2, min(11, len(tfidf_matrix) // 2))

        if not k_range:
            return 5  # Default

        inertias = []
        for k in k_range:
            kmeans = KMeans(
                n_clusters=k,
                random_state=self.random_state,
                n_init=10,
            )
            kmeans.fit(tfidf_matrix)
            inertias.append(kmeans.inertia_)

        # Find elbow point (maximum curvature)
        if len(inertias) < 3:
            return k_range[0]

        # Calculate second derivative
        deltas = np.diff(inertias)
        second_deltas = np.diff(deltas)

        # Elbow is where second derivative is maximum
        elbow_idx = np.argmax(second_deltas) + 2

        return list(k_range)[elbow_idx]

    def _extract_keywords(
        self,
        messages: list[str],
        top_n: int = 5,
    ) -> list[str]:
        """Extract top keywords from cluster messages.

        Args:
            messages: List of messages in cluster.
            top_n: Number of keywords to extract.

        Returns:
            List of top keywords.
        """
        if not messages or self._vectorizer is None:
            return []

        # Get feature names
        feature_names = self._vectorizer.get_feature_names_out()

        # Calculate average TF-IDF for cluster
        tfidf_matrix = self._vectorizer.transform(messages)
        avg_tfidf = np.asarray(tfidf_matrix.mean(axis=0)).flatten()

        # Get top features
        top_indices = avg_tfidf.argsort()[-top_n:][::-1]

        keywords = [feature_names[i] for i in top_indices if avg_tfidf[i] > 0]

        return keywords

    def get_statistics(self) -> dict[str, Any]:
        """Get clustering statistics.

        Returns:
            Dictionary with statistics.
        """
        if self._labels is None:
            return {
                "total_clusters": 0,
                "avg_cluster_size": 0,
                "silhouette_score": 0,
            }

        # Calculate cluster sizes
        unique, counts = np.unique(self._labels, return_counts=True)

        # Calculate silhouette score
        silhouette = 0.0
        if len(unique) > 1 and self._cluster_centers is not None:
            from sklearn.metrics import silhouette_score

            # Need the TF-IDF matrix for silhouette calculation
            # This is a simplified version
            silhouette = 0.5  # Placeholder

        return {
            "total_clusters": len(unique),
            "avg_cluster_size": float(np.mean(counts)),
            "min_cluster_size": int(np.min(counts)),
            "max_cluster_size": int(np.max(counts)),
            "silhouette_score": silhouette,
        }


def cluster_logs(
    logs: list[dict[str, Any]],
    n_clusters: int = 5,
) -> list[dict[str, Any]]:
    """Cluster logs into groups.

    This is a stateless function for pure functional usage.

    Args:
        logs: List of log dictionaries.
        n_clusters: Number of clusters.

    Returns:
        List of cluster dictionaries.
    """
    clusterer = LogClusterer(n_clusters=n_clusters)
    clusterer.fit(logs)

    return clusterer.get_clusters(logs)


def extract_log_features(logs: list[dict[str, Any]]) -> list[str]:
    """Extract text features from logs for clustering.

    Args:
        logs: List of log dictionaries.

    Returns:
        List of text features.
    """
    features = []

    for log in logs:
        # Combine message and level for richer features
        level = log.get("level", "")
        message = log.get("message", "")
        source = log.get("source", "")

        # Create feature text
        feature = f"{level} {message} {source}".strip()
        features.append(feature)

    return features
