package service

import "github.com/indulgeback/telos/services/workflow-service/internal/model"

type WorkflowService struct{}

func (s *WorkflowService) ListWorkflows() []model.Workflow {
	return []model.Workflow{}
}

func (s *WorkflowService) GetWorkflow(id string) *model.Workflow {
	return &model.Workflow{ID: id}
}
