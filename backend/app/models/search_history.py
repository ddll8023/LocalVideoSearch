"""搜索历史数据模型"""
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class SearchHistory(Base):
    """搜索历史"""

    __tablename__ = "search_history"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
        comment="主键",
    )
    keyword: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, comment="搜索关键词"
    )
    search_count: Mapped[int] = mapped_column(
        Integer, default=1, comment="累计搜索次数"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        onupdate=func.now(),
        comment="更新时间",
    )
