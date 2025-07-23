package repository

import "github.com/indulgeback/telos/services/workflow-service/internal/model"

type WorkflowRepository struct{}

func (r *WorkflowRepository) GetAll() []model.Workflow {
	return []model.Workflow{}
}

func (r *WorkflowRepository) GetByID(id string) *model.Workflow {
	return &model.Workflow{ID: id}
}
