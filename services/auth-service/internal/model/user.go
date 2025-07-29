package model

import "time"

type User struct {
	ID          string     `json:"id" gorm:"primaryKey"`
	Username    string     `json:"username" gorm:"not null"`
	Email       string     `json:"email" gorm:"unique;not null"`
	Password    string     `json:"-" gorm:""`                       // 可选，OAuth用户可能没有密码
	Image       string     `json:"image" gorm:""`                   // 用户头像
	Provider    string     `json:"provider" gorm:"default:'local'"` // 登录提供商：local, github, google等
	LastLoginAt *time.Time `json:"last_login_at" gorm:""`           // 最后登录时间
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}
