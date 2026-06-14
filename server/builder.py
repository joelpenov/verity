from langchain_classic.vectorstores import Chroma
from langchain_classic.embeddings import OpenAIEmbeddings
from langchain_classic.retrievers import BM25Retriever, EnsembleRetriever
from config.settings import settings
import logging

logger = logging.getLogger(__name__)

class RetrieverBuilder:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings(api_key=settings.openai_api_key)

    def build_hybrid_retriever(self, docs, collection_name: str = "langchain"):
        """Build a hybrid retriever using BM25 and vector-based retrieval."""
        try:
            vector_store = Chroma.from_documents(
                documents=docs,
                embedding=self.embeddings,
                collection_name=collection_name,
                persist_directory=settings.CHROMA_DB_PATH
            )
            logger.info("Vector store created successfully.")

            bm25 = BM25Retriever.from_documents(docs)
            logger.info("BM25 retriever created successfully.")

            vector_retriever = vector_store.as_retriever(search_kwargs={"k": settings.VECTOR_SEARCH_K})
            logger.info("Vector retriever created successfully.")

            ensemble_retriever = EnsembleRetriever(
                retrievers=[bm25, vector_retriever],
                weights=[0.5, 0.5]
            )
            logger.info("Ensemble retriever created successfully.")
            return ensemble_retriever
        except Exception as e:
            logger.error(f"Failed to build hybrid retriever: {e}")
            raise
