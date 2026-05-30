FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /app

EXPOSE 8080

# 默认环境变量
ENV SERVER_PORT=8080
ENV DB_HOST=mysql
ENV DB_PORT=3306
ENV DB_USER=root
ENV DB_PASSWORD=root
ENV DB_NAME=go_lighthouse
ENV TZ=Asia/Shanghai

CMD ["./go-lighthouse"]
