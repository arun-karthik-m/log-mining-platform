#!/usr/bin/env python3
"""
Live log generator that sends logs to the backend via webhook endpoint.
Simulates realistic application log traffic for testing.

Usage:
    python scripts/live_log_generator.py [--url URL] [--interval SECONDS] [--count COUNT]
"""

import argparse
import json
import random
import time
from datetime import datetime, timezone

import requests

SERVICES = [
    "auth-service", "search-service", "payment-service",
    "database-service", "cache-service", "api-gateway",
    "notification-service", "inventory-service",
]

USERS = [f"user_{i:03d}" for i in range(1, 21)]

LOG_TEMPLATES = [
    # Auth events
    {"level": "INFO", "message": "User login successful from {device}", "source": "auth-service", "event": "auth"},
    {"level": "INFO", "message": "Authentication token refreshed for session", "source": "auth-service", "event": "auth"},
    {"level": "INFO", "message": "User logout completed", "source": "auth-service", "event": "auth"},
    {"level": "WARN", "message": "Failed login attempt for user {user}", "source": "auth-service", "event": "auth"},
    {"level": "ERROR", "message": "Authentication service error invalid credentials", "source": "auth-service", "event": "auth"},
    # Search events
    {"level": "INFO", "message": "Search query executed for {product}", "source": "search-service", "event": "search"},
    {"level": "INFO", "message": "Search returned {count} results", "source": "search-service", "event": "search"},
    {"level": "WARN", "message": "Search query timeout after 5000ms", "source": "search-service", "event": "search"},
    # Database events
    {"level": "INFO", "message": "Database query completed in {ms}ms", "source": "database-service", "event": "db"},
    {"level": "WARN", "message": "Database slow query detected {ms}ms", "source": "database-service", "event": "db"},
    {"level": "ERROR", "message": "Database connection timeout error", "source": "database-service", "event": "db"},
    {"level": "ERROR", "message": "Database deadlock detected on table {table}", "source": "database-service", "event": "db"},
    # Payment events
    {"level": "INFO", "message": "Payment processed successfully amount {amount}", "source": "payment-service", "event": "payment"},
    {"level": "ERROR", "message": "Payment gateway error timeout exceeded", "source": "payment-service", "event": "payment"},
    {"level": "ERROR", "message": "Payment failed card declined by issuer", "source": "payment-service", "event": "payment"},
    # Infrastructure
    {"level": "INFO", "message": "Health check passed all services responding", "source": "api-gateway", "event": "infra"},
    {"level": "INFO", "message": "Request processed in {ms}ms status 200", "source": "api-gateway", "event": "infra"},
    {"level": "WARN", "message": "High memory usage detected {pct} percent", "source": "api-gateway", "event": "infra"},
    {"level": "ERROR", "message": "Service unavailable for request to {service}", "source": "api-gateway", "event": "infra"},
    # Cache events
    {"level": "DEBUG", "message": "Cache hit for key {key}", "source": "cache-service", "event": "cache"},
    {"level": "DEBUG", "message": "Cache miss for key {key}", "source": "cache-service", "event": "cache"},
    {"level": "WARN", "message": "Cache eviction triggered memory at {pct} percent", "source": "cache-service", "event": "cache"},
]

DEVICES = ["desktop", "mobile", "tablet", "API"]
PRODUCTS = ["laptop", "phone", "tablet", "headphones", "monitor", "keyboard", "camera", "speaker"]
TABLES = ["orders", "users", "products", "inventory", "payments"]
CACHE_KEYS = ["products_p1", "user_prefs", "cart_items", "search_results", "session_data"]


def generate_log():
    template = random.choice(LOG_TEMPLATES)
    user = random.choice(USERS)
    session = f"live_sess_{user}_{random.randint(1, 5)}"

    message = template["message"].format(
        device=random.choice(DEVICES),
        user=user,
        product=random.choice(PRODUCTS),
        count=random.randint(5, 200),
        ms=random.randint(10, 3000),
        amount=f"${random.randint(10, 500)}.{random.randint(0, 99):02d}",
        table=random.choice(TABLES),
        service=random.choice(SERVICES),
        pct=random.randint(70, 99),
        key=random.choice(CACHE_KEYS),
    )

    return {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": template["level"],
        "message": message,
        "source": template["source"],
        "metadata": {
            "user_id": user,
            "session_id": session,
        },
    }


def main():
    parser = argparse.ArgumentParser(description="Generate live logs for testing")
    parser.add_argument("--url", default="http://localhost:8000/api/v1/logs/webhook",
                        help="Webhook URL (default: http://localhost:8000/api/v1/logs/webhook)")
    parser.add_argument("--interval", type=float, default=1.0,
                        help="Seconds between log batches (default: 1.0)")
    parser.add_argument("--batch-size", type=int, default=3,
                        help="Logs per batch (default: 3)")
    parser.add_argument("--count", type=int, default=0,
                        help="Total logs to send (0=infinite, default: 0)")
    args = parser.parse_args()

    print(f"Sending logs to {args.url}")
    print(f"Batch size: {args.batch_size}, Interval: {args.interval}s")
    if args.count:
        print(f"Will send {args.count} logs total")
    else:
        print("Running indefinitely (Ctrl+C to stop)")
    print()

    sent = 0
    try:
        while True:
            logs = [generate_log() for _ in range(args.batch_size)]

            try:
                resp = requests.post(args.url, json={"logs": logs}, timeout=10)
                sent += len(logs)
                status = "OK" if resp.status_code == 200 else f"ERR {resp.status_code}"
                levels = ", ".join(l["level"] for l in logs)
                print(f"[{sent:>5}] {status} | {levels}")
            except requests.exceptions.ConnectionError:
                print(f"[{sent:>5}] Connection refused - is the backend running?")
            except Exception as e:
                print(f"[{sent:>5}] Error: {e}")

            if args.count and sent >= args.count:
                break

            time.sleep(args.interval)
    except KeyboardInterrupt:
        print(f"\nStopped. Total logs sent: {sent}")


if __name__ == "__main__":
    main()
