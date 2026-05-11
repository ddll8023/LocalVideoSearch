"""业务异常定义"""


class ServiceException(Exception):
    """业务服务异常"""

    def __init__(self, code: int, message: str):
        self.code = code
        self.message = message
        super().__init__(message)

