#!/bin/sh
set -eu

AUTH="-a ${REDIS_PASSWORD} --no-auth-warning"

if redis-cli $AUTH -h redis-node-1 -p 6379 cluster info | grep -q 'cluster_state:ok'; then
  echo "Redis cluster already initialised."
  exit 0
fi

echo "Creating Redis cluster (3 masters, 3 replicas)..."
redis-cli $AUTH --cluster create \
  redis-node-1:6379 redis-node-2:6379 redis-node-3:6379 \
  redis-node-4:6379 redis-node-5:6379 redis-node-6:6379 \
  --cluster-replicas 1 --cluster-yes

for i in $(seq 1 30); do
  if redis-cli $AUTH -h redis-node-1 -p 6379 cluster info | grep -q 'cluster_state:ok'; then
    echo "Redis cluster is ready."
    exit 0
  fi
  sleep 1
done

echo "Redis cluster did not reach state ok in time." >&2
exit 1
