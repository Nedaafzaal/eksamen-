//information om vores database. Eksporterer den således vores modeller har adgang til at forbinde til databasen

module.exports = {
    user: 'prog584',
    password: 'Hejhej123!',
    database: 'eksamenserver',
    server: 'eksamenserver1.database.windows.net',
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
    options: { encrypt: true, trustServerCertificate: false }
  };
  
  