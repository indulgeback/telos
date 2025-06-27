package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/indulgeback/telos/services/auth-service/internal/model"
	"github.com/indulgeback/telos/services/auth-service/internal/repository"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthService interface {
	RegisterUser(ctx context.Context, username, email, password string) (*model.User, error)
	LoginUser(ctx context.Context, email, password string) (string, error)
	ValidateToken(token string) (string, error)
}

type authService struct {
	userRepo   repository.UserRepository
	jwtSecret  string
	tokenValid time.Duration
}

func NewAuthService(userRepo repository.UserRepository, jwtSecret string, tokenValid time.Duration) AuthService {
	return &authService{
		userRepo:   userRepo,
		jwtSecret:  jwtSecret,
		tokenValid: tokenValid,
	}
}

func (s *authService) RegisterUser(ctx context.Context, username, email, password string) (*model.User, error) {
	// 检查邮箱是否已存在
	_, err := s.userRepo.GetUserByEmail(email)
	if err == nil {
		return nil, errors.New("email already exists")
	}

	// 创建用户
	user := &model.User{
		ID:        uuid.New().String(),
		Username:  username,
		Email:     email,
		Password:  hashPassword(password), // 密码哈希函数需要自己实现
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	err = s.userRepo.CreateUser(user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

func (s *authService) LoginUser(ctx context.Context, email, password string) (string, error) {
	user, err := s.userRepo.GetUserByEmail(email)
	if err != nil {
		return "", errors.New("invalid credentials")
	}

	// 验证密码
	if !checkPasswordHash(password, user.Password) {
		return "", errors.New("invalid credentials")
	}

	// 生成JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": user.ID,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(s.tokenValid).Unix(),
	})

	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return "", fmt.Errorf("failed to generate token: %w", err)
	}

	return tokenString, nil
}

func (s *authService) ValidateToken(tokenString string) (string, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.jwtSecret), nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims["sub"].(string), nil
	}

	return "", errors.New("invalid token")
}

func hashPassword(password string) string {
	hashedBytes, _ := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	return string(hashedBytes)
}

func checkPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}
