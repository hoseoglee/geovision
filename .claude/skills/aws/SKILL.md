# AWS Skill

AWS 서비스를 CLI로 제어하는 스킬. Lambda, API Gateway, S3, DynamoDB, EC2 등 주요 서비스를 관리한다.

트리거: "AWS", "아마존", "람다", "lambda", "S3", "EC2", "DynamoDB", "API Gateway", "aws 배포", "서버리스 배포"
DO NOT TRIGGER: AWS 계정 생성/가입 안내만 요청, 단순 요금 질문

## 사전 요구사항

1. **AWS CLI v2**: `aws --version`으로 확인. 없으면 설치:
   ```bash
   # ARM64 (Raspberry Pi)
   curl -s "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o /tmp/awscliv2.zip
   unzip -qo /tmp/awscliv2.zip -d /tmp/ && sudo /tmp/aws/install

   # x86_64 (Linux)
   curl -s "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
   unzip -qo /tmp/awscliv2.zip -d /tmp/ && sudo /tmp/aws/install

   # macOS
   brew install awscli
   ```

2. **API 키**: Anima secrets에 저장
   ```bash
   # 키 확인
   ~/.anima/scripts/secret.sh get aws.access_key_id
   ~/.anima/scripts/secret.sh get aws.secret_access_key
   ~/.anima/scripts/secret.sh get aws.region
   ```

## AWS 인증 설정

스킬 실행 시 매번 환경변수로 인증한다 (aws configure 파일 대신):

```bash
export AWS_ACCESS_KEY_ID=$(~/.anima/scripts/secret.sh get aws.access_key_id)
export AWS_SECRET_ACCESS_KEY=$(~/.anima/scripts/secret.sh get aws.secret_access_key)
export AWS_DEFAULT_REGION=$(~/.anima/scripts/secret.sh get aws.region)
```

**IMPORTANT**: 키를 대화/보고서/커밋에 절대 노출하지 않는다.

## 서비스별 명령어

### Lambda (Serverless 함수)

```bash
# 함수 목록
aws lambda list-functions --query 'Functions[].FunctionName'

# 함수 생성 (Python)
zip -j /tmp/function.zip lambda_function.py
aws lambda create-function \
  --function-name my-function \
  --runtime python3.12 \
  --role arn:aws:iam::ACCOUNT_ID:role/lambda-role \
  --handler lambda_function.lambda_handler \
  --zip-file fileb:///tmp/function.zip

# 함수 업데이트 (코드만)
zip -j /tmp/function.zip lambda_function.py
aws lambda update-function-code \
  --function-name my-function \
  --zip-file fileb:///tmp/function.zip

# 함수 호출 (테스트)
aws lambda invoke \
  --function-name my-function \
  --payload '{"key": "value"}' \
  /tmp/response.json && cat /tmp/response.json

# 함수 삭제
aws lambda delete-function --function-name my-function

# 로그 확인
aws logs tail /aws/lambda/my-function --since 1h
```

### API Gateway (HTTP 엔드포인트)

```bash
# REST API 목록
aws apigateway get-rest-apis

# HTTP API 생성 (Lambda 연동, 간편)
aws apigatewayv2 create-api \
  --name my-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:REGION:ACCOUNT_ID:function:my-function

# API 목록 (HTTP API v2)
aws apigatewayv2 get-apis

# API 삭제
aws apigatewayv2 delete-api --api-id API_ID
```

### S3 (파일 저장소)

```bash
# 버킷 목록
aws s3 ls

# 버킷 생성
aws s3 mb s3://my-bucket-name

# 파일 업로드
aws s3 cp local-file.txt s3://my-bucket/path/
aws s3 sync ./local-dir/ s3://my-bucket/dir/

# 파일 다운로드
aws s3 cp s3://my-bucket/path/file.txt ./
aws s3 sync s3://my-bucket/dir/ ./local-dir/

# 파일 목록
aws s3 ls s3://my-bucket/path/

# 파일 삭제
aws s3 rm s3://my-bucket/path/file.txt
aws s3 rm s3://my-bucket/path/ --recursive

# 버킷 삭제 (비어있어야 함)
aws s3 rb s3://my-bucket --force
```

### DynamoDB (NoSQL DB)

```bash
# 테이블 목록
aws dynamodb list-tables

# 테이블 생성
aws dynamodb create-table \
  --table-name my-table \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# 아이템 추가
aws dynamodb put-item \
  --table-name my-table \
  --item '{"id": {"S": "1"}, "name": {"S": "test"}}'

# 아이템 조회
aws dynamodb get-item \
  --table-name my-table \
  --key '{"id": {"S": "1"}}'

# 전체 스캔
aws dynamodb scan --table-name my-table

# 테이블 삭제
aws dynamodb delete-table --table-name my-table
```

### EC2 (가상 서버)

```bash
# 인스턴스 목록
aws ec2 describe-instances \
  --query 'Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,State:State.Name,IP:PublicIpAddress}'

# 인스턴스 시작/중지
aws ec2 start-instances --instance-ids i-xxxxx
aws ec2 stop-instances --instance-ids i-xxxxx

# 인스턴스 종료 (삭제)
aws ec2 terminate-instances --instance-ids i-xxxxx
```

### CloudWatch (모니터링/로그)

```bash
# 로그 그룹 목록
aws logs describe-log-groups --query 'logGroups[].logGroupName'

# 최근 로그 확인
aws logs tail /aws/lambda/my-function --since 30m --follow

# 비용 확인 (이번 달)
aws ce get-cost-and-usage \
  --time-period Start=$(date -d "$(date +%Y-%m-01)" +%Y-%m-%d),End=$(date +%Y-%m-%d) \
  --granularity MONTHLY \
  --metrics BlendedCost
```

### IAM (권한 관리)

```bash
# 현재 사용자 확인
aws sts get-caller-identity

# IAM 사용자 목록
aws iam list-users --query 'Users[].UserName'

# Lambda 실행 역할 생성
aws iam create-role \
  --role-name lambda-basic-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [{"Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole"}]
  }'
aws iam attach-role-policy \
  --role-name lambda-basic-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
```

## 워크플로우: Serverless API 배포

Lambda + API Gateway로 REST API를 배포하는 전체 흐름:

### 1. Lambda 함수 작성
```python
# lambda_function.py
import json

def lambda_handler(event, context):
    body = json.loads(event.get('body', '{}')) if event.get('body') else {}
    path = event.get('rawPath', '/')
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')

    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({'message': 'Hello from Lambda', 'path': path, 'method': method})
    }
```

### 2. IAM 역할 생성 → Lambda 배포 → API Gateway 연결
```bash
# 역할 생성
ROLE_ARN=$(aws iam create-role \
  --role-name my-api-lambda-role \
  --assume-role-policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}' \
  --query 'Role.Arn' --output text)
aws iam attach-role-policy --role-name my-api-lambda-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
sleep 10  # IAM 전파 대기

# Lambda 배포
zip -j /tmp/function.zip lambda_function.py
aws lambda create-function \
  --function-name my-api \
  --runtime python3.12 \
  --role "$ROLE_ARN" \
  --handler lambda_function.lambda_handler \
  --zip-file fileb:///tmp/function.zip

# API Gateway 생성 + Lambda 연결
API_ID=$(aws apigatewayv2 create-api \
  --name my-api \
  --protocol-type HTTP \
  --target arn:aws:lambda:$(aws configure get region):$(aws sts get-caller-identity --query Account --output text):function:my-api \
  --query 'ApiId' --output text)

echo "API URL: https://${API_ID}.execute-api.$(aws configure get region).amazonaws.com"
```

### 3. Lambda 권한 추가 (API Gateway → Lambda 호출 허용)
```bash
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
REGION=$(aws configure get region)
aws lambda add-permission \
  --function-name my-api \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*"
```

## 비용 안전장치

```bash
# 현재 무료 티어 사용량 확인
aws freetier get-free-tier-usage --query 'freeTierUsages[?forecastedUsageAmount>`0`]'

# 빌링 알람 설정 (월 $1 초과 시)
aws cloudwatch put-metric-alarm \
  --alarm-name billing-alarm \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --statistic Maximum \
  --period 21600 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:billing-alert \
  --dimensions Name=Currency,Value=USD
```

## 키 발급 방법

1. https://aws.amazon.com/free/ 에서 계정 생성 (신용카드 필요)
2. AWS 콘솔 → IAM → Users → Create User
   - 이름: `anima-cli`
   - Attach policies: `AdministratorAccess`
3. 생성된 사용자 → Security credentials → Create access key
   - Use case: "Command Line Interface (CLI)"
   - **Access Key ID** (AKIA...) 복사
   - **Secret Access Key** 복사
4. Anima secrets에 저장:
   ```bash
   # ~/.anima/secrets.yaml에 추가
   aws:
     access_key_id: "AKIA..."
     secret_access_key: "..."
     region: "ap-northeast-2"   # 서울 리전

   # 암호화
   ~/.anima/scripts/secret.sh encrypt
   ```
5. 연결 확인:
   ```bash
   export AWS_ACCESS_KEY_ID=$(~/.anima/scripts/secret.sh get aws.access_key_id)
   export AWS_SECRET_ACCESS_KEY=$(~/.anima/scripts/secret.sh get aws.secret_access_key)
   export AWS_DEFAULT_REGION=$(~/.anima/scripts/secret.sh get aws.region)
   aws sts get-caller-identity
   ```

## 검증 기준

- [ ] AWS CLI v2 설치됨 (`aws --version`)
- [ ] Anima secrets에 AWS 키 저장됨
- [ ] `aws sts get-caller-identity` 성공
- [ ] Lambda 함수 생성/호출 가능
- [ ] S3 버킷 목록 조회 가능

## 변경 이력

| 날짜 | 변경 내용 | 트리거 |
|------|----------|--------|
| 2026-03-13 | 초기 생성 | 사용자 요청 |
