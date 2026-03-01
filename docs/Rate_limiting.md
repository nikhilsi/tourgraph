Rate limiting
We impose rate limits on the usage of this API to prevent excessive demands being made of our system that might otherwise affect its availability for all users.

Our methodology involves applying a rate-limit on a per-endpoint / per-PUID (Partner Unique ID) basis; therefore, reaching the rate-limit with respect to your usage of one endpoint will only affect the availablility of that endpoint, not the others.

We do not have a universal rate limit that applies to all users. The rate limit you are required to operate within is based on a standard commensurate with the scale of your operation.

This is to say that if the volume of traffic to your site is such that under normal conditions your operations are causing you to frequently receive HTTP 429 (Too Many Requests) responses, you can ask for your rate-limit to be increased. If that is the case, please speak to your account manager to discuss whether increasing your rate limit would be the appropriate solution.

Interpreting the HTTP 429 response
If a request to an endpoint yields an HTTP 429 (Too Many Requests) response, information regarding your present usage status can be located in the following four header fields:

RateLimit-Limit
Total limit of requests for this endpoint per rolling 10s time window
RateLimit-Remaining:
The number of requests that remain available to you in the present 10s period
RateLimit-Reset:
How long (in seconds) from the present moment it would take for the number of available requests to reach its maximum value
Retry-After:
A recommendation regarding how long (in seconds) it would be optimal to wait before making a subsequent call to that endpoint
Example HTTP 429 response:

HTTP/1.1 429
...
..
RateLimit-Limit: 16
RateLimit-Remaining: 0
RateLimit-Reset: 10
Retry-After: 10
...
..
 
{ 
  "code":"TOO_MANY_REQUESTS",
  "message":"Too many requests, please try again",
  "timestamp":"2022-09-13T13:25:26.179433Z",
  "trackingId":"4badb933-ad65-4464-ae9c-c20e4a70c0d2"
}
This can interpreted as:

RateLimit-Limit: 16

You can make 16 requests to this endpoint per 10s rolling time window
RateLimit-Remaining: 0

You have no remaining requests available in the current 10s epoch (as you would expect, since it is for this reason that you are receiving this response in the first place)
RateLimit-Reset: 10

If you were to wait 10s, your RateLimit-Remaining value would reach its maximum; which, in this case, is 16 requests
Retry-After: 10

It is recommended you pause for 10s before re-attempting to call this endpoint
Note that these rate-limit-related values will also be returned in the HTTP 200 (success) response. Inspect these values if you wish to estimate whether your method of implementing this API will remain sustainable at scale.

Concurrency-based rate limiting
While rate-limiting is imposed per API key, if our system reaches its capacity on account of high demand overall, you may be rate limited even though you have not personally exceeded your individual rate limit.

In this case, you will receive a HTTP 503 (Service Unavailable) response. The header of this response will include the Retry-After field. In the example below, the recommendation is to pause for 60s before retrying the request: e.g.:

HTTP/1.1 503
...
..
Retry-After: 60
...
..
 
{"code":"SERVICE_UNAVAILABLE","message":"Service is currently unavailable, please try again","timestamp":"2022-09-13T08:52:48.693734Z","trackingId":"fc342644-e48f-4fd9-96e3-a6860607d405"}
