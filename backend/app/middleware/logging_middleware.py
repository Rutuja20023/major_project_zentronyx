import time
import uuid
import logging
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("zentronyx.access")


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        start_time = time.time()
        response = await call_next(request)
        duration_ms = round((time.time() - start_time) * 1000, 2)

        response.headers["X-Request-ID"] = request_id

        # Do not log noisy static or docs health polling in debug
        path = request.url.path
        if not (path.endswith(".png") or path.endswith(".ico") or path.endswith(".css")):
            logger.info(
                f"{request.method} {path} - Status: {response.status_code} - Duration: {duration_ms}ms [ReqID: {request_id}]"
            )

        return response
