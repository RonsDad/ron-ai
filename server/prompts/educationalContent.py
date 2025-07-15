"""
Educational Content Generation Prompt Template
Claude Code SDK Educational Wrapper
"""

import anthropic
import os
from typing import Dict, Any, List, Optional

def create_educational_content_message(
    content_type: str,
    subject: str,
    learning_level: str,
    duration: str,
    learning_objectives: List[str],
    prerequisites: Optional[List[str]] = None,
    additional_context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Creates a structured educational content generation request for Claude
    
    Args:
        content_type: Type of content (lesson, quiz, assessment, tutorial, etc.)
        subject: Subject area (programming, science, math, etc.)
        learning_level: Target audience level (beginner, intermediate, advanced)
        duration: Expected time to complete (e.g., "30 minutes", "2 hours")
        learning_objectives: List of specific learning outcomes
        prerequisites: Required prior knowledge (optional)
        additional_context: Any additional context or constraints
    
    Returns:
        Dict containing the structured message for Claude
    """
    
    # Build prerequisite context
    prereq_context = ""
    if prerequisites:
        prereq_context = f"\n\nPrerequisites:\n" + "\n".join(f"- {prereq}" for prereq in prerequisites)
    
    # Build objectives context
    objectives_context = "\n\nLearning Objectives:\n" + "\n".join(f"- {obj}" for obj in learning_objectives)
    
    # Add additional context if provided
    context_addition = f"\n\nAdditional Context:\n{additional_context}" if additional_context else ""
    
    system_prompt = f"""You are an expert educational content creator and instructional designer with extensive experience in creating engaging, effective learning materials. Your mission is to create high-quality educational content that promotes deep understanding and practical application.

CORE PRINCIPLES:
1. **Learning-Centered Design**: Every element should serve the learner's understanding
2. **Research-Backed**: Use current educational research and best practices
3. **Inclusive and Accessible**: Content should be accessible to diverse learners
4. **Progressive Complexity**: Build knowledge systematically from simple to complex
5. **Active Learning**: Incorporate interactive elements and practical applications
6. **Assessment Integration**: Include formative and summative assessment opportunities

CONTENT CREATION FRAMEWORK:
1. **Research Phase**: Use web search and academic sources to gather current information
2. **Content Structuring**: Organize information using proven pedagogical frameworks
3. **Interactive Elements**: Create engaging activities, examples, and practice opportunities
4. **Assessment Design**: Develop appropriate evaluation methods
5. **Accessibility Review**: Ensure content works for diverse learning needs

QUALITY STANDARDS:
- Factual accuracy verified through multiple sources
- Clear, age-appropriate language
- Logical progression of concepts
- Practical, real-world applications
- Multiple learning modalities (visual, auditory, kinesthetic)
- Cultural sensitivity and inclusivity

TOOLS AVAILABLE:
- Web search for current information and examples
- Academic research capabilities
- Interactive content generation
- Assessment creation tools
- Multimedia integration support

Your goal is to create content that not only informs but transforms learners' understanding and capabilities."""

    user_content = f"""Create a comprehensive {content_type} for {subject} targeted at {learning_level} learners.

CONTENT SPECIFICATIONS:
- Type: {content_type}
- Subject: {subject}
- Learning Level: {learning_level}
- Duration: {duration}{prereq_context}{objectives_context}{context_addition}

CONTENT REQUIREMENTS:
1. **Structure**: Use clear headings, subheadings, and logical flow
2. **Engagement**: Include interactive elements, examples, and real-world applications
3. **Assessment**: Incorporate knowledge checks and practical exercises
4. **Accessibility**: Ensure content is accessible to diverse learners
5. **Research-Backed**: Use current, credible sources to support content
6. **Practical Application**: Include hands-on activities or projects

RESEARCH APPROACH:
1. First, research the latest information about {subject} relevant to {learning_level} learners
2. Identify current best practices in teaching this topic
3. Find real-world examples and case studies
4. Locate appropriate multimedia resources or references
5. Verify factual accuracy through multiple sources

DELIVERABLE FORMAT:
Create a comprehensive educational package that includes:
- Main content with clear structure
- Interactive elements and activities
- Assessment components
- Resource recommendations
- Implementation guidance

Begin with thorough research using available tools, then create the educational content following proven instructional design principles."""

    message_config = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 30000,
        "temperature": 0.3,  # Lower temperature for more consistent educational content
        "system": system_prompt,
        "messages": [
            {
                "role": "user",
                "content": user_content
            }
        ],
        "tools": [
            {
                "name": "web_search",
                "type": "web_search_20250305"
            },
            {
                "type": "custom",
                "name": "pubmed_eutils",
                "description": "Search academic literature for educational research and evidence-based practices",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "searchTerm": {
                            "type": "string",
                            "description": "Search query for academic literature"
                        },
                        "maxResults": {
                            "type": "integer",
                            "default": 10,
                            "description": "Maximum number of results to return"
                        }
                    },
                    "required": ["searchTerm"]
                }
            },
            {
                "type": "custom",
                "name": "create_interactive_content",
                "description": "Generate interactive educational content like simulations, interactive demos, or hands-on activities",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "content_type": {
                            "type": "string",
                            "enum": ["simulation", "interactive_demo", "hands_on_activity", "quiz", "assessment", "game"]
                        },
                        "subject": {
                            "type": "string",
                            "description": "Subject area for the interactive content"
                        },
                        "learning_objectives": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Specific learning objectives to address"
                        },
                        "difficulty_level": {
                            "type": "string",
                            "enum": ["beginner", "intermediate", "advanced"]
                        },
                        "duration": {
                            "type": "string",
                            "description": "Expected completion time"
                        }
                    },
                    "required": ["content_type", "subject", "learning_objectives", "difficulty_level"]
                }
            },
            {
                "type": "custom",
                "name": "generate_assessment",
                "description": "Create comprehensive assessments including quizzes, tests, and rubrics",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "assessment_type": {
                            "type": "string",
                            "enum": ["quiz", "test", "project_rubric", "peer_assessment", "self_assessment"]
                        },
                        "subject": {
                            "type": "string",
                            "description": "Subject area for assessment"
                        },
                        "learning_objectives": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Learning objectives to assess"
                        },
                        "question_types": {
                            "type": "array",
                            "items": {
                                "type": "string",
                                "enum": ["multiple_choice", "true_false", "short_answer", "essay", "practical", "case_study"]
                            },
                            "description": "Types of questions to include"
                        },
                        "difficulty_level": {
                            "type": "string",
                            "enum": ["beginner", "intermediate", "advanced"]
                        },
                        "duration": {
                            "type": "string",
                            "description": "Expected completion time"
                        }
                    },
                    "required": ["assessment_type", "subject", "learning_objectives", "difficulty_level"]
                }
            }
        ],
        "betas": ["web-search-2025-03-05", "interleaved-thinking-2025-05-14"]
    }
    
    return message_config

def create_curriculum_message(
    course_title: str,
    duration: str,
    learning_level: str,
    modules: List[Dict[str, Any]],
    assessment_strategy: str,
    additional_context: Optional[str] = None
) -> Dict[str, Any]:
    """
    Creates a curriculum development request for Claude
    
    Args:
        course_title: Title of the course/curriculum
        duration: Total course duration
        learning_level: Target audience level
        modules: List of module specifications
        assessment_strategy: Overall assessment approach
        additional_context: Any additional requirements
    
    Returns:
        Dict containing the structured message for Claude
    """
    
    modules_context = "\n\nModule Specifications:\n"
    for i, module in enumerate(modules, 1):
        modules_context += f"Module {i}: {module.get('title', 'Untitled')}\n"
        modules_context += f"- Duration: {module.get('duration', 'Not specified')}\n"
        modules_context += f"- Objectives: {', '.join(module.get('objectives', []))}\n"
        if module.get('topics'):
            modules_context += f"- Topics: {', '.join(module['topics'])}\n"
        modules_context += "\n"
    
    context_addition = f"\n\nAdditional Requirements:\n{additional_context}" if additional_context else ""
    
    system_prompt = """You are a master curriculum designer with expertise in creating comprehensive educational programs. Your specialty is developing structured, progressive learning experiences that build competency systematically.

CURRICULUM DESIGN PRINCIPLES:
1. **Backward Design**: Start with end goals and work backward to create learning path
2. **Progressive Complexity**: Build skills and knowledge incrementally
3. **Alignment**: Ensure assessments, activities, and content align with objectives
4. **Differentiation**: Accommodate different learning styles and paces
5. **Real-World Relevance**: Connect learning to practical applications
6. **Continuous Improvement**: Include feedback loops and iteration opportunities

CURRICULUM COMPONENTS:
1. **Course Overview**: Vision, goals, and outcomes
2. **Module Structure**: Logical progression of learning units
3. **Assessment Strategy**: Formative and summative evaluation plan
4. **Resource Integration**: Multimedia, readings, and supplementary materials
5. **Implementation Guide**: Instructor support and delivery recommendations
6. **Quality Assurance**: Evaluation criteria and improvement mechanisms

Your task is to create a comprehensive curriculum that provides clear learning pathways while maintaining flexibility for different learning contexts."""

    user_content = f"""Design a comprehensive curriculum for: {course_title}

CURRICULUM SPECIFICATIONS:
- Title: {course_title}
- Duration: {duration}
- Learning Level: {learning_level}
- Assessment Strategy: {assessment_strategy}{modules_context}{context_addition}

DELIVERABLES:
1. **Curriculum Overview**: Goals, outcomes, and structure
2. **Detailed Module Plans**: Content, activities, and assessments for each module
3. **Assessment Framework**: Evaluation strategy and rubrics
4. **Implementation Guide**: Delivery recommendations and instructor support
5. **Resource Recommendations**: Required and supplementary materials
6. **Quality Metrics**: Success indicators and improvement mechanisms

Begin with research on current best practices in curriculum design for this subject area, then create the comprehensive curriculum following proven instructional design frameworks."""

    message_config = {
        "model": "claude-sonnet-4-20250514",
        "max_tokens": 35000,
        "temperature": 0.2,
        "system": system_prompt,
        "messages": [
            {
                "role": "user",
                "content": user_content
            }
        ],
        "tools": [
            {
                "name": "web_search",
                "type": "web_search_20250305"
            },
            {
                "type": "custom",
                "name": "curriculum_analyzer",
                "description": "Analyze existing curricula and educational standards for benchmarking",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "subject_area": {
                            "type": "string",
                            "description": "Subject area for curriculum analysis"
                        },
                        "education_level": {
                            "type": "string",
                            "description": "Educational level (K-12, undergraduate, graduate, professional)"
                        },
                        "standards_framework": {
                            "type": "string",
                            "description": "Educational standards framework to reference"
                        }
                    },
                    "required": ["subject_area", "education_level"]
                }
            }
        ],
        "betas": ["web-search-2025-03-05", "interleaved-thinking-2025-05-14"]
    }
    
    return message_config

# Usage example (for testing/development)
if __name__ == "__main__":
    # Example content generation
    content_config = create_educational_content_message(
        content_type="tutorial",
        subject="Python Programming",
        learning_level="beginner",
        duration="2 hours",
        learning_objectives=[
            "Understand basic Python syntax and data types",
            "Write simple Python programs with variables and functions",
            "Debug common Python errors"
        ],
        prerequisites=["Basic computer literacy"],
        additional_context="Focus on practical coding exercises with immediate feedback"
    )
    
    # Example curriculum generation
    curriculum_config = create_curriculum_message(
        course_title="Introduction to Web Development",
        duration="12 weeks",
        learning_level="beginner",
        modules=[
            {
                "title": "HTML Fundamentals",
                "duration": "2 weeks",
                "objectives": ["Create semantic HTML documents", "Understand web accessibility"],
                "topics": ["HTML elements", "Document structure", "Forms and inputs"]
            },
            {
                "title": "CSS Styling",
                "duration": "3 weeks",
                "objectives": ["Apply CSS styling", "Create responsive layouts"],
                "topics": ["CSS selectors", "Flexbox", "Grid", "Responsive design"]
            }
        ],
        assessment_strategy="Project-based with peer review",
        additional_context="Emphasize hands-on projects and portfolio development"
    )