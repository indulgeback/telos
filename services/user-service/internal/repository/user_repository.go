package repository

import "github.com/indulgeback/telos/services/user-service/internal/model"

type UserRepository struct{}

func (r *UserRepository) GetAll() []model.User {
	return []model.User{}
}

func (r *UserRepository) GetByID(id string) *model.User {
	return &model.User{ID: id}
}
