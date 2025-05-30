# DOS Project 

## 1. Introduction

The project was built based on the instructions provided in the course (DOS) and the instructor as follows, a microservices-based application simulating a simple online bookstore. The system allows users to search for books by topic, get information about specific books, and purchase them. It is built using a modern technology stack including Node.js, Docker, Docker Swarm, Nginx, and Redis, emphasizing scalability and resilience through its microservice architecture and container orchestration.


## 2. Overall Program Design

The application follows a microservice architecture, decomposing the bookstore functionality into distinct, independently deployable services. This design promotes modularity, scalability, and resilience.

**Core Components:**

*   **Catalog Service (`catalog-server`)**
*   **Order Service (`order-server`)**
*   **Client Service (`client`)**
*   **Nginx (`nginx`)**
*   **Redis (`redis`)**
*   **Docker & Docker Swarm**
* The entire application is containerized using Docker. Docker Compose (`docker-compose.yml`, `docker-compose.override.yml`) is used for defining and running the multi-container application in development. Docker Swarm (`docker-swarm.yml` and associated scripts in `scripts/`) is used for orchestration in a simulated production environment, enabling features like service scaling, rolling updates, health checks, and resource management.

**Technology Stack:**

*   **Backend Services (Catalog, Order, Client):** Node.js with Express framework.
*   **Database (Catalog):** SQLite (simple file-based relational database).
*   **Caching:** Redis.
*   **Load Balancer/Reverse Proxy:** Nginx.
*   **Containerization & Orchestration:** Docker, Docker Compose, Docker Swarm.
*   **Client CLI:** Commander.js, Inquirer.js.
*   **Client Web UI:** Basic HTML/CSS/JavaScript served by Express.



## 3. How to Run the Program

This section provides instructions for running the application in both development and simulated production (auto-scaling) modes.

**Prerequisites:**
*   Docker installed and running.
*   Docker Compose installed.
*   Git (for cloning if necessary, though the code is provided).
*   A terminal or command prompt.

**Setup:**
1.  Ensure you have the project code extracted, specifically the `DosProjP1` directory.
2.  Navigate to the `DosProjP1` directory in your terminal:
    ```bash
    cd /path/to/project_repo/DOS-Repo/DosProjP1
    ```

**A. Running in Development Mode (Single Replicas):**

This mode uses `docker-compose` and the `docker-compose.override.yml` file to run single instances of each service, suitable for local development and testing.

1.  **Build and Start Services:**
    ```bash
    docker-compose up --build
    ```
    This command builds the Docker images (if they don't exist or have changed) based on the `Dockerfile` and starts all services defined in `docker-compose.yml` and `docker-compose.override.yml` (the override is applied automatically).
2.  **Accessing the Application:**
    *   **Web UI:** Open your web browser and navigate to `http://localhost/`. (Note: The client service runs on port 3007 internally, but Nginx exposes it on port 80).
    *   **CLI:** You can run the CLI commands by executing the client service container directly or by modifying the `CMD` in the `Dockerfile` or `docker-compose.yml` to run specific CLI commands. For interactive CLI use, you might run:
        ```bash
        docker-compose exec client node src/client/index.mjs <command>
        # Example:
        docker-compose exec client node src/client/index.mjs s # For search
        ```
        Follow the prompts provided by the CLI.
    *   **Direct Service Access (for testing/debugging):**
        *   Catalog Service: `http://localhost/catalog-server` (endpoints /info/:id, /search/:bookTopic)
        *   Order Service: `http://localhost/order-server` (endpoint /purchase, must include book id and amount of available money to purchase in body)
        *   Client Service: `http://localhost:3007`
        *   Nginx: `http://localhost:80`
        *   Redis: `localhost:6379`
3.  **Stopping Services:**
    Press `Ctrl+C` in the terminal where `docker-compose up` is running. To remove the containers, run:
    ```bash
    docker-compose down
    ```

**B. Running in Production Mode (Docker Swarm with Auto-Scaling):**

This mode utilizes Docker Swarm and the provided scripts (`deploy.sh`, `scale.sh`, `monitor.sh`) to simulate a production environment with multiple replicas and load balancing.

1.  **Initialize Docker Swarm (if not already initialized):**
    ```bash
    docker swarm init
    ```
    (If you are already part of a swarm, you might need to leave it first: `docker swarm leave --force`)
2.  **Make Scripts Executable:**
    ```bash
    chmod +x scripts/*.sh
    ```
3.  **Deploy the Stack:**
    ```bash
    ./scripts/deploy.sh
    ```
    This script uses `docker stack deploy` with the `docker-swarm.yml` configuration file. It will build the necessary images and deploy the services as a stack named `dos-app`. By default, it starts with multiple replicas for Catalog, Order, and Nginx services as defined in `docker-swarm.yml`.
4.  **Accessing the Application:**
    Access is the same as in development mode, primarily through Nginx:
    *   **Web UI:** `http://localhost/`
    *   **CLI:** Use `docker exec` to run commands within the running client container instance. First, find the client container ID (`docker ps`), then:
        ```bash
        docker exec -it <client_container_id> node src/client/index.mjs <command>
        # Example:
        docker exec -it <client_container_id> node src/client/index.mjs s
        ```
5.  **Monitoring Services:**
    Use the provided monitoring script:
    ```bash
    # Single snapshot
    ./scripts/monitor.sh

    # Continuous monitoring (updates every 30s)
    ./scripts/monitor.sh --continuous
    ```
    You can also use standard Docker Swarm commands:
    ```bash
    docker service ls
    docker service ps dos-app_catalog-server
    docker service logs dos-app_catalog-server
    ```
6.  **Scaling Services Manually:**
    Use the scaling script:
    ```bash
    # Scale catalog service to 5 replicas
    ./scripts/scale.sh catalog 5

    # Scale order service down to 1 replica
    ./scripts/scale.sh order 1
    ```
7.  **Removing the Stack:**
    ```bash
    docker stack rm dos-app
    ```
8.  **Leaving Swarm Mode:**
    ```bash
    docker swarm leave --force
    ```
## 4. Conclusion

Through specific endpoints and scripts, the project incorporates fundamental mechanisms for performance and health monitoring. Despite the lack of specific experimental data in the repository, systematic performance measurement is possible with the tools available. Like the hypothetical example given here, conducting controlled load tests with different replica counts and monitoring the exposed metrics would yield tangible data for performance analysis and optimization.
