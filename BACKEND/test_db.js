const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:azocv2vmp3yjw8gr@147.15.99.82:5435/aca-dental',
});

client.connect()
  .then(() => {
    console.log('✅ Conexão estabelecida com sucesso ao PostgreSQL (aca-dental)!');
    return client.query('SELECT NOW() AS atual');
  })
  .then((res) => {
    console.log('🕒 Data/Hora retornada pelo BD:', res.rows[0].atual);
  })
  .catch((err) => {
    console.error('❌ Erro ao conectar ao Banco de Dados:', err);
  })
  .finally(() => {
    client.end();
  });
