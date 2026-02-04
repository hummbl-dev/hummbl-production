#!/bin/bash
#
# HUMMBL Health Monitor
# Simple script to continuously monitor API health
#

API_URL="https://hummbl-api.hummbl.workers.dev"
INTERVAL=${1:-30}  # Default 30 seconds

echo "🔍 HUMMBL Health Monitor"
echo "========================"
echo "API: $API_URL"
echo "Interval: ${INTERVAL}s"
echo "Press Ctrl+C to stop"
echo ""

while true; do
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  
  # Fetch health
  RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL/health" 2>/dev/null)
  BODY=$(echo "$RESPONSE" | head -n -1)
  STATUS=$(echo "$RESPONSE" | tail -n 1)
  
  # Parse JSON if possible
  if command -v jq &> /dev/null; then
    HEALTH_STATUS=$(echo "$BODY" | jq -r '.status // "unknown"' 2>/dev/null)
    MODELS=$(echo "$BODY" | jq -r '.models_count // "?"' 2>/dev/null)
    ALERTS=$(echo "$BODY" | jq -r '.alerts | length' 2>/dev/null)
    
    # Color coding
    if [ "$HEALTH_STATUS" = "healthy" ]; then
      STATUS_EMOJI="✅"
    elif [ "$HEALTH_STATUS" = "degraded" ]; then
      STATUS_EMOJI="⚠️"
    else
      STATUS_EMOJI="❌"
    fi
    
    # Alert indicator
    if [ "$ALERTS" -gt 0 ]; then
      ALERT_EMOJI="🚨 ($ALERTS)"
    else
      ALERT_EMOJI=""
    fi
    
    echo "[$TIMESTAMP] $STATUS_EMOJI $HEALTH_STATUS | Models: $MODELS | HTTP: $STATUS $ALERT_EMOJI"
    
    # Show alerts if any
    if [ "$ALERTS" -gt 0 ]; then
      echo "$BODY" | jq -r '.alerts[]' 2>/dev/null | sed 's/^/  → /'
    fi
  else
    # Simple output without jq
    echo "[$TIMESTAMP] HTTP: $STATUS | Raw: ${BODY:0:50}..."
  fi
  
  sleep "$INTERVAL"
done
