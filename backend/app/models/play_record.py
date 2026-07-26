"""播放记录数据模型"""
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class PlayRecord(Base):
    """播放记录"""

    __tablename__ = "play_record"
    __table_args__ = (
        UniqueConstraint("site_id", "vod_id", name="uq_play_record_site_vod"),
    )

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
    keyword: Mapped[str] = mapped_column(
        String(100), comment="搜索关键词，用于重查详情"
    )
    line_name: Mapped[str] = mapped_column(
        String(100), default="", comment="播放线路名"
    )
    episode_index: Mapped[int] = mapped_column(
        Integer, default=0, comment="剧集索引，从 0 开始"
    )
    episode_name: Mapped[str] = mapped_column(
        String(100), default="", comment="剧集名称"
    )
    position_seconds: Mapped[int] = mapped_column(
        Integer, default=0, comment="播放位置（秒）"
    )
    duration_seconds: Mapped[int] = mapped_column(
        Integer, default=0, comment="视频总时长（秒）"
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
