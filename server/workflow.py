from langgraph.graph import StateGraph, END
from typing import TypedDict, List, Dict
from research_agent import ResearchAgent
from verification_agent import VerificationAgent
from relevance_checker import RelevanceChecker
from langchain_core.documents import Document
from langchain_classic.retrievers import EnsembleRetriever
import logging

logger = logging.getLogger(__name__)

class AgentState(TypedDict):
    question: str
    documents: List[Document]
    draft_answer: str
    verification_report: str
    is_relevant: bool
    relevance_classification: str
    retriever: EnsembleRetriever
    research_iterations: int

class AgentWorkflow:

    MAX_RESEARCH_ITERATIONS = 3

    def __init__(self):
        self.researcher = ResearchAgent()
        self.verifier = VerificationAgent()
        self.relevance_checker = RelevanceChecker()
        self.compiled_workflow = self.build_workflow()

    def build_workflow(self):
        """Create and compile the multi-agent workflow."""
        workflow = StateGraph(AgentState)
        # Add nodes
        workflow.add_node("check_relevance", self._check_relevance_step)
        workflow.add_node("research", self._research_step)
        workflow.add_node("verify", self._verification_step)
        # Define edges
        workflow.set_entry_point("check_relevance")
        workflow.add_conditional_edges(
            "check_relevance",
            self._decide_after_relevance_check,
            {
                "relevant": "research",
                "irrelevant": END
            }
        )
        workflow.add_edge("research", "verify")
        workflow.add_conditional_edges(
            "verify",
            self._decide_next_step,
            {
                "re_research": "research",
                "end": END
            }
        )
        return workflow.compile()
    
    def _check_relevance_step(self, state: AgentState) -> Dict:
        retriever = state["retriever"]
        classification = self.relevance_checker.check(
            question=state["question"],
            retriever=retriever,
            k=20,
        )
        if classification in ("CAN_ANSWER", "PARTIAL"):
            documents = retriever.invoke(state["question"])
            logger.info(f"Retrieved {len(documents)} documents after relevance check ({classification})")
            return {"is_relevant": True, "relevance_classification": classification, "documents": documents}
        else:
            return {
                "is_relevant": False,
                "relevance_classification": "NO_MATCH",
                "draft_answer": "This question isn't related (or there's no data) for your query. Please ask another question relevant to the uploaded document(s).",
            }
        
    def _decide_after_relevance_check(self, state: AgentState) -> str:
        decision = "relevant" if state["is_relevant"] else "irrelevant"
        print(f"[DEBUG] _decide_after_relevance_check -> {decision}")
        return decision
    
    def full_pipeline(self, question: str, retriever: EnsembleRetriever):
        try:
            logger.info(f"Starting full_pipeline with question='{question}'")
            initial_state = AgentState(
                question=question,
                documents=[],
                draft_answer="",
                verification_report="",
                is_relevant=False,
                relevance_classification="",
                retriever=retriever,
                research_iterations=0,
            )
            final_state = self.compiled_workflow.invoke(initial_state)
            return {
                "draft_answer": final_state["draft_answer"],
                "verification_report": final_state["verification_report"],
                "relevance": final_state["relevance_classification"],
            }
        except Exception as e:
            logger.error(f"Workflow execution failed: {e}")
            raise

    def _research_step(self, state: AgentState) -> Dict:
        iteration = state["research_iterations"] + 1
        logger.info(f"Research iteration {iteration}, question='{state['question']}'")
        # On re-research iterations, re-retrieve with a broader k to surface new context
        documents = state["documents"]
        if iteration > 1:
            documents = state["retriever"].invoke(state["question"])
            logger.info(f"Re-retrieved {len(documents)} documents for iteration {iteration}")
        result = self.researcher.generate(state["question"], documents)
        return {"draft_answer": result["draft_answer"], "research_iterations": iteration}
    
    def _verification_step(self, state: AgentState) -> Dict:
        print("[DEBUG] Entered _verification_step. Verifying the draft answer...")
        result = self.verifier.check(state["draft_answer"], state["documents"])
        print("[DEBUG] VerificationAgent returned a verification report.")
        return {"verification_report": result["verification_report"]}
    
    def _decide_next_step(self, state: AgentState) -> str:
        verification_report = state["verification_report"]
        failed = "Supported: NO" in verification_report or "Relevant: NO" in verification_report
        if failed and state["research_iterations"] < self.MAX_RESEARCH_ITERATIONS:
            logger.info(f"Verification failed, re-researching (iteration {state['research_iterations']})")
            return "re_research"
        logger.info("Verification passed or max iterations reached, ending workflow.")
        return "end"

