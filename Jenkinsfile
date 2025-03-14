pipeline {
    agent any 
    stages {
        stage('Docker Build') { 
            steps {
                echo "This is Build stage."
                echo "docker build -t 181098/test-guvi:$BUILD_NUMBER . production"
                echo "Printing Job URL : $JOB_URL"
            }
        }
        stage('Docker push') { 
            steps {
                echo "This is docker push stage. production"
                sh "docker push 181098/test-guvi:$BUILD_NUMBER"
            }
        }
    }
}
