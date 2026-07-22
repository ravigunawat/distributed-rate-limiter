import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  scenarios: {
    burst_load: {
      executor: "constant-arrival-rate",
      rate: 200, // 200 iterations per second
      timeUnit: "1s",
      duration: "30s",
      preAllocatedVUs: 100,
      maxVUs: 500,
    },
  },
  thresholds: {
    http_req_duration: ["p(99)<50"], // p99 under 50ms target
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:4000";
const API_KEY = __ENV.API_KEY || "demo-key-123";

export default function () {
  const res = http.post(
    `${BASE_URL}/api/check`,
    JSON.stringify({ route: "default" }),
    {
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
      },
    }
  );

  check(res, {
    "status is 200 or 429": (r) => r.status === 200 || r.status === 429,
  });
}
