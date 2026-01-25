#!/bin/bash

# HUMMBL Production Monitoring Script
# Checks API health, rate limiting, and security headers

API_URL="https://hummbl-api.hummbl.workers.dev"
WEB_URL="https://hummbl.io"

echo "🔍 HUMMBL Production Health Check"
echo "=================================="

# API Health Check
echo -e "\n📡 API Health Check:"
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$API_STATUS" = "200" ]; then
    echo "✅ API is healthy (200)"
    # Parse JSON without jq dependency
    API_RESPONSE=$(curl -s "$API_URL/health")
    echo "Status: $(echo "$API_RESPONSE" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)"
    echo "Version: $(echo "$API_RESPONSE" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)"
    echo "Models: $(echo "$API_RESPONSE" | grep -o '"models_count":[0-9]*' | cut -d':' -f2)"
else
    echo "❌ API returned status: $API_STATUS"
fi

# Security Headers Check
echo -e "\n🔒 Security Headers Check:"
HEADERS=$(curl -s -I "$API_URL/health")
echo "$HEADERS" | grep -i "x-content-type-options" && echo "✅ X-Content-Type-Options" || echo "❌ Missing X-Content-Type-Options"
echo "$HEADERS" | grep -i "x-frame-options" && echo "✅ X-Frame-Options" || echo "❌ Missing X-Frame-Options"
echo "$HEADERS" | grep -i "x-xss-protection" && echo "✅ X-XSS-Protection" || echo "❌ Missing X-XSS-Protection"
echo "$HEADERS" | grep -i "referrer-policy" && echo "✅ Referrer-Policy" || echo "❌ Missing Referrer-Policy"

# Website Check
echo -e "\n🌐 Website Health Check:"
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WEB_URL")
if [ "$WEB_STATUS" = "200" ]; then
    echo "✅ Website is healthy (200)"
else
    echo "❌ Website returned status: $WEB_STATUS"
fi

# Rate Limiting Test
echo -e "\n⚡ Rate Limiting Test:"
for i in {1..5}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/v1/models/P1")
    echo "Request $i: $STATUS"
    sleep 0.1
done

echo -e "\n📊 Monitoring complete at $(date)"
echo "=================================="
