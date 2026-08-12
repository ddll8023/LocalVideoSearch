"""资源站服务常量定义"""

RESOURCE_CONFIG_ROOT_KEY = "sites"

TEST_HEADERS = {
    "Accept": "application/json",
    "Accept-Encoding": "gzip, deflate",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
    ),
}

CONNECTION_SUCCESS_MESSAGE = "连接成功，API响应正常"
CONNECTION_FAILED_MESSAGE = "连接失败"
CONFIG_READ_ERROR_MESSAGE = "配置读取失败"
CONFIG_SAVE_ERROR_MESSAGE = "配置保存失败"
