"""视频收藏数据模型"""
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Favorite(Base):
    """视频收藏"""

    __tablename__ = "favorite"
    __table_args__ = (UniqueConstraint("site_id", "vod_id", name="uq_favorite_site_vod"),)

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"),
        primary_key=True,
        autoincrement=True,
        comment="主键",
    )
    site_id: Mapped[str] = mapped_column(String(50), index=True, comment="资源站 ID")
    vod_id: Mapped[str] = mapped_column(String(50), comment="视频 ID")
    title: Mapped[str] = mapped_column(String(200), comment="视频标题")
    thumbnail: Mapped[str] = mapped_column(String(500), default="", comment="海报地址")
    type_name: Mapped[str] = mapped_column(String(50), default="", comment="视频类型名")
    remarks: Mapped[str] = mapped_column(
        String(100), default="", comment="备注快照，如更新至第几集"
    )
    keyword: Mapped[str] = mapped_column(
        String(100), comment="收藏时的搜索关键词，用于重查详情"
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
