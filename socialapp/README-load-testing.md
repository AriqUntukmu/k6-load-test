# Cloud Run Load Testing Guide - Optimized for 1000 Concurrent Requests

## Overview

This guide provides optimized k6 load testing scenarios designed to help you determine the maximum CPU and memory usage for your Google Cloud Run service while respecting the 1000 concurrent requests per instance limit.

## Test Scenarios

### 1. Main Load Test (`socialapp.js`)

**Purpose**: Comprehensive load testing with realistic user journeys
**Target**: 400-600 VUs (Virtual Users) for ~1000 concurrent requests

**Scenarios**:

- **Ramp-up Test**: Gradual increase from 10 to 600 VUs over 16 minutes
- **Sustained Load Test**: Constant 400 VUs for 10 minutes
- **Spike Test**: Sudden spike to 700 VUs to test auto-scaling

**Expected Load**:

- Each VU makes 3 HTTP requests (Twitter auth + Join + Use referral)
- Average 500ms per request = ~1.5s total per user journey
- 400 VUs × 3 requests = ~800-1200 concurrent requests at peak

### 2. CPU & Memory Stress Test (`cpu-memory-stress-test.js`)

**Purpose**: Intensive CPU and memory usage testing
**Target**: Maximum resource utilization within Cloud Run limits

**Scenarios**:

- **CPU Stress**: 50-600 VUs with intensive cryptographic operations
- **Memory Stress**: 300 VUs with large object allocations
- **Combined Stress**: Up to 800 RPS with both CPU and memory load

## Resource Monitoring

### Key Metrics to Watch

1. **CPU Usage**: Target 70-85% at peak load
2. **Memory Usage**: Monitor for memory pressure indicators
3. **Response Times**: p95 < 2000ms, p99 < 5000ms
4. **Error Rate**: < 2% for stress tests
5. **Concurrent Connections**: Stay under 1000 per instance

### Custom Metrics Added

- `resource_usage_ms`: Total request processing time
- `concurrent_users`: Active virtual users
- `memory_pressure_indicator`: Simulated memory usage
- `cpu_intensive_operations`: Count of CPU-heavy operations
- `memory_allocations`: Count of memory allocations

## Running the Tests

### Prerequisites

```bash
# Install k6
brew install k6  # macOS
# or
sudo apt-get install k6  # Ubuntu
```

### Execute Tests

```bash
# Run main load test
k6 run socialapp/socialapp.js

# Run CPU/Memory stress test
k6 run socialapp/cpu-memory-stress-test.js

# Run with custom thresholds
k6 run --threshold http_req_duration=p\(95\)\<1500 socialapp/socialapp.js
```

### Monitor Cloud Run During Tests

```bash
# Watch Cloud Run metrics in real-time
gcloud run services describe YOUR_SERVICE_NAME \
  --region=YOUR_REGION \
  --format="get(status.traffic[0].latestRevision)"

# Monitor logs
gcloud logs tail "resource.type=cloud_run_revision" \
  --filter="resource.labels.service_name=YOUR_SERVICE_NAME"
```

## Expected Results & Analysis

### Optimal Cloud Run Configuration

Based on test results, you should see:

**For 8GiB Memory, 4 CPU:**

- **Max VUs**: 400-500 before performance degradation
- **Peak RPS**: 600-800 requests/second
- **CPU Usage**: 60-80% at optimal load
- **Memory Usage**: 4-6GiB at peak

**For 16GiB Memory, 8 CPU:**

- **Max VUs**: 600-800 before performance degradation
- **Peak RPS**: 1000-1200 requests/second
- **CPU Usage**: 50-70% at optimal load
- **Memory Usage**: 6-10GiB at peak

### Performance Thresholds

| Metric              | Good    | Warning     | Critical |
| ------------------- | ------- | ----------- | -------- |
| CPU Usage           | <70%    | 70-85%      | >85%     |
| Memory Usage        | <80%    | 80-90%      | >90%     |
| Response Time p95   | <2000ms | 2000-3000ms | >3000ms  |
| Error Rate          | <1%     | 1-2%        | >2%      |
| Concurrent Requests | <800    | 800-950     | >950     |

## Interpreting Test Results

### CPU Bottlenecks

**Symptoms**:

- High response times with CPU >85%
- Increased error rates during CPU stress test
- Timeouts during signature generation

**Solutions**:

- Increase CPU allocation (6-8 vCPU)
- Optimize cryptographic operations
- Add caching for signature generation

### Memory Bottlenecks

**Symptoms**:

- Memory usage >90%
- Out of memory errors in logs
- Performance degradation during memory stress test

**Solutions**:

- Increase memory allocation (12-16GiB)
- Optimize payload sizes
- Implement request batching

### Concurrency Bottlenecks

**Symptoms**:

- Error rate spikes at high VU counts
- Connection timeouts
- Service unavailable errors

**Solutions**:

- Reduce max concurrent requests per instance (500-750)
- Increase minimum instances
- Implement request queuing

## Recommended Cloud Run Settings

### Conservative (Stable Performance)

```yaml
resources:
  limits:
    cpu: 4
    memory: 8Gi
annotations:
  autoscaling.knative.dev/maxScale: '50'
  autoscaling.knative.dev/minScale: '3'
  run.googleapis.com/execution-environment: gen2
containerConcurrency: 750
```

### Aggressive (Maximum Throughput)

```yaml
resources:
  limits:
    cpu: 8
    memory: 16Gi
annotations:
  autoscaling.knative.dev/maxScale: '100'
  autoscaling.knative.dev/minScale: '5'
  run.googleapis.com/cpu-throttling: 'false'
  run.googleapis.com/execution-environment: gen2
containerConcurrency: 1000
```

## Troubleshooting

### Common Issues

1. **Cold Starts**: Increase minimum instances
2. **Memory Leaks**: Monitor memory trends over time
3. **CPU Spikes**: Check for inefficient algorithms
4. **High Latency**: Verify database connection pooling

### Debug Commands

```bash
# Check current resource usage
k6 run --summary-trend-stats="avg,min,med,max,p(90),p(95),p(99)" socialapp/socialapp.js

# Export detailed results
k6 run --out json=results.json socialapp/socialapp.js

# Run with verbose logging
k6 run --verbose socialapp/socialapp.js
```

This optimized testing approach will help you find the sweet spot for your Cloud Run configuration while staying within the 1000 concurrent request limit.
