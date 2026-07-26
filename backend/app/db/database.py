"""数据库引擎、会话与初始化"""
import logging

from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings
from app.schemas.response import ErrorCode
from app.utils.exception import ServiceException


logger = logging.getLogger(__name__)

engine = create_engine(
    f"sqlite:///{settings.DATABASE_PATH}",
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    """启用 WAL 模式与外键约束"""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


class Base(DeclarativeBase):
    """ORM 声明基类"""


def get_db():
    """数据库会话生命周期管理"""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def commit_or_rollback(db: Session):
    """提交事务，失败时回滚并转换为业务异常"""
    try:
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error(f"数据库提交失败: error={exc}", exc_info=True)
        raise ServiceException(ErrorCode.INTERNAL_ERROR, "操作失败") from exc


def init_db():
    """创建全部数据表"""
    from app.models import favorite, play_record, search_history  # noqa: F401

    Base.metadata.create_all(bind=engine)
