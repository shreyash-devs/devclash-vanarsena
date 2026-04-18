from sqlalchemy import Column, String, Integer, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func

Base = declarative_base()

class Repository(Base):
    __tablename__ = 'repositories'

    id = Column(String, primary_key=True, index=True) # E.g. "langchain-ai/langchain"
    name = Column(String, nullable=False)
    url = Column(String, unique=True, nullable=False)
    primary_language = Column(String)
    star_count = Column(Integer, default=0)
    description = Column(Text)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    jobs = relationship("AnalysisJob", back_populates="repository", cascade="all, delete")


class AnalysisJob(Base):
    __tablename__ = 'analysis_jobs'

    id = Column(String, primary_key=True, index=True) # UUID
    repo_id = Column(String, ForeignKey('repositories.id'), nullable=True)
    
    status = Column(String, default="pending") # pending, cloning, parsing, completed, failed
    error_message = Column(Text, nullable=True)
    
    files_processed = Column(Integer, default=0)
    total_files = Column(Integer, default=0)

    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    repository = relationship("Repository", back_populates="jobs")
