package tool

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"github.com/cloudwego/eino/components/tool"
	"github.com/cloudwego/eino/schema"
)

// CalculatorTool 计算器工具
type CalculatorTool struct{}

func (c *CalculatorTool) Info(ctx context.Context) (*schema.ToolInfo, error) {
	return &schema.ToolInfo{
		Name: "calculator",
		Desc: "执行基本数学运算，支持加减乘除和幂运算",
		ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
			"expression": {
				Type:     schema.String,
				Desc:     "数学表达式，例如: 1+1, 2*3, 4^2, 10/2",
				Required: true,
			},
		}),
	}, nil
}

func (c *CalculatorTool) InvokableRun(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error) {
	var args struct {
		Expression string `json:"expression"`
	}

	if err := json.Unmarshal([]byte(argumentsInJSON), &args); err != nil {
		return "", fmt.Errorf("invalid arguments: %w", err)
	}

	// 简单的计算器实现
	result, err := calculate(args.Expression)
	if err != nil {
		return "", fmt.Errorf("calculation error: %w", err)
	}

	return fmt.Sprintf("%s = %.2f", args.Expression, result), nil
}

// calculate 简单的数学表达式计算
func calculate(expr string) (float64, error) {
	// 这里实现一个简单的计算器
	// 实际项目中可以使用更完善的表达式解析库
	result := 0.0
	operator := '+'
	num := 0.0

	for i := 0; i < len(expr); i++ {
		ch := expr[i]

		if ch >= '0' && ch <= '9' || ch == '.' {
			// 解析数字
			numStr := ""
			for i < len(expr) && (expr[i] >= '0' && expr[i] <= '9' || expr[i] == '.') {
				numStr += string(expr[i])
				i++
			}
			i-- // 回退一步

			fmt.Sscanf(numStr, "%f", &num)

			switch operator {
			case '+':
				result += num
			case '-':
				result -= num
			case '*':
				result *= num
			case '/':
				if num == 0 {
					return 0, fmt.Errorf("division by zero")
				}
				result /= num
			case '^':
				result = math.Pow(result, num)
			}
		} else if ch == '+' || ch == '-' || ch == '*' || ch == '/' || ch == '^' {
			operator = rune(ch)
		}
	}

	return result, nil
}

// WeatherTool 天气查询工具 (模拟)
type WeatherTool struct{}

func (w *WeatherTool) Info(ctx context.Context) (*schema.ToolInfo, error) {
	return &schema.ToolInfo{
		Name: "get_weather",
		Desc: "获取指定城市的天气信息",
		ParamsOneOf: schema.NewParamsOneOfByParams(map[string]*schema.ParameterInfo{
			"city": {
				Type:     schema.String,
				Desc:     "城市名称，例如: 北京, 上海, 广州",
				Required: true,
			},
		}),
	}, nil
}

func (w *WeatherTool) InvokableRun(ctx context.Context, argumentsInJSON string, opts ...tool.Option) (string, error) {
	var args struct {
		City string `json:"city"`
	}

	if err := json.Unmarshal([]byte(argumentsInJSON), &args); err != nil {
		return "", fmt.Errorf("invalid arguments: %w", err)
	}

	// 模拟天气数据
	weatherData := map[string]map[string]interface{}{
		"北京": { "temp": float64(5), "condition": "晴", "humidity": float64(45), "wind": "西北风3级" },
		"上海": { "temp": float64(12), "condition": "多云", "humidity": float64(65), "wind": "东风2级" },
		"广州": { "temp": float64(22), "condition": "阴", "humidity": float64(75), "wind": "南风2级" },
		"深圳": { "temp": float64(24), "condition": "晴", "humidity": float64(70), "wind": "东南风3级" },
	}

	data, ok := weatherData[args.City]
	if !ok {
		// 返回随机天气
		data = map[string]interface{}{
			"temp":      20 + (time.Now().Unix()%15),
			"condition": []string{"晴", "多云", "阴", "小雨"}[time.Now().Unix()%4],
			"humidity":  50 + (time.Now().Unix()%30),
			"wind":      "微风",
		}
	}

	return fmt.Sprintf("%s天气: %d°C, %s, 湿度%d%%, %s",
		args.City,
		int(data["temp"].(float64)),
		data["condition"],
		int(data["humidity"].(float64)),
		data["wind"]), nil
}
