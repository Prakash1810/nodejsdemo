pipeline {
    agent any 
    stages {
        stage('Docker Build') { 
            steps {
                echo "This is Build stage."
                echo "docker build -t docker_url:$BUILD_NUMBER ."
                echo "Printing Job URL : $JOB_URL"
            }
        }
        stage('Docker push') { 
            steps {
                echo "This is docker push stage."
                echo "docker push docker_url:$BUILD_NUMBER"
            }
        }
    }
}
