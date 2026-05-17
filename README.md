# Role-based knowledge base

We implemented a web application that allows users with different roles (regular users and administrator) to share and manage posts. Regular users can register, log in, and write posts, while administrators have additional privileges to confirm user registrations and manage content. The project follows a containerized microservices architecture with a complete monitoring stack for tracking metrics.

## Team members
- Igor Baranov - FastAPI backend, PostgreSQL database management
- Alexey Chegaev - frontend
- Denis Nurmuhametov - Graphana, Prometheus, CI/CD pipeline with E2E tests

## Application overview

- **PostgreSQL**: relational database to store users and knowledge base content.
- **Python FastAPI backend**: REST API that handles authentication, role-based access control, and knowledge base CRUD operations.
- **TypeScript frontend**: web interface with role-based views for different user types.
- **Prometheus**: metrics collection and storage from the backend.
- **Grafana**: metrics visualization and dashboarding.
- **Docker Compose**: containerizes all services (frontend, backend, database, Prometheus, Grafana), provides proper `.env` secrets management.
- **GitHub Actions**: CI/CD pipeline for automated testing.

## Technologies used

- Python FastAPI
- TypeScript (Vite) + CSS
- PostgreSQL
- Prometheus
- Grafana
- Docker + Docker Compose
- GitHub Actions
- Pytest



## How to launch

Firslty, ensure that Docker and Docker Compose are installed and ports `5173`, `8000`, `9090`, `3000` available.

Then, clone the repository:

```bash
git clone https://github.com/mmagia/Role-Based-Knowledge-Base.git
cd Role-Based-Knowledge-Base
```

After, clean previous containers and start the service with the example environment file:

```bash
docker compose down
docker compose --env-file .env.example up --build -d
```


## User scenario example

1. Open [http://localhost:5173](http://localhost:5173)
2. Click **Register**, enter `testuser` / `pass123`
3. Click **Go back to login**, enter `testuser` / `pass123`
4. Open a new tab, choose **Admin**, login as `admin` / `admin123`
5. Click **Confirm**
6. Return to the `testuser` tab, refresh the page and login
7. Write a post

## Monitoring and metrics endpoints

After launching the service, you can monitor various metrics at the following endpoints:

### FastAPI
- **[http://localhost:8000/metrics](http://localhost:8000/metrics)** – Raw metrics endpoint showing request logs and backend metrics

### Prometheus
- **[http://localhost:9090/targets](http://localhost:9090/targets)** – Check backend status and target health
- **[http://localhost:9090/graph](http://localhost:9090/graph)** – Query and visualize metric graphs directly in Prometheus

### Grafana
- **[http://localhost:3000](http://localhost:3000)** – Grafana dashboard 
  - To access:
    - Login: `admin` / `admin`
    - Click **Skip** on the password change prompt
    - Navigate to: **Dashboards -> FastAPI Metrics**
  - Here you can find all backend metrics including:
    - Request count and rates
    - Memory usage
    - Response time
    - Request size in bytes





