up:
	docker compose up -d

down:
	docker compose down -v

logs:
	docker compose logs -f

build:
	docker compose build --no-cache

pull:
	docker compose pull
