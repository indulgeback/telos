package service

import "github.com/indulgeback/telos/services/user-service/internal/model"

type UserService struct{}

func (s *UserService) ListUsers() []model.User {
	return []model.User{}
}

func (s *UserService) GetUser(id string) *model.User {
	return &model.User{ID: id}
}
