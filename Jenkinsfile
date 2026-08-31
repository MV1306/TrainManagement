pipeline {
    agent any

    environment {
        DOTNET_CLI_TELEMETRY_OPTOUT = '1'
        NODE_ENV = 'production'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build API') {
            steps {
                dir('api') {
                    bat 'dotnet restore'
                    bat 'dotnet build --configuration Release --no-restore'
                }
            }
        }

        stage('Build UI') {
            steps {
                dir('ui') {
                    bat 'npm install'
                    bat 'npx vite build'
                }
            }
        }

        stage('Test') {
            steps {
                dir('api') {
                    bat 'dotnet test --configuration Release --no-build --verbosity normal'
                }
            }
        }

        stage('Publish API') {
            steps {
                dir('api') {
                    bat 'dotnet publish --configuration Release --output ../publish/api'
                }
            }
        }

        stage('Archive') {
            steps {
                archiveArtifacts artifacts: 'publish/**', fingerprint: true
            }
        }
    }

    post {
        failure {
            echo 'Build failed!'
        }
        success {
            echo 'Build succeeded!'
        }
    }
}
