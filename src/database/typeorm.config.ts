import { lookup } from 'dns/promises';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

export { ConfigModule, ConfigService };
export const typeOrmModule = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const databaseUrl = config.get<string>('DATABASE_URL');
      const url = new URL(databaseUrl!);
      // The pg driver keeps the first DNS answer: on hosts where IPv6 is
      // returned first, the pooler connection dies with a fast ETIMEDOUT
      // before any fallback. We resolve an IPv4 address ourselves and
      // connect to it directly.
      const { address } = await lookup(url.hostname, { family: 4 });
      const options = ['-c timezone=UTC'];
      if (url.hostname.endsWith('.neon.tech')) {
        // Neon's pooler requires the endpoint ID (first label of the
        // hostname) when the TLS SNI cannot carry it (IP connection).
        options.push(`endpoint=${url.hostname.split('.')[0]}`);
      }
      return {
        type: 'postgres',
        host: address,
        port: Number(url.port ?? 5432),
        database: url.pathname.slice(1),
        username: url.username ? decodeURIComponent(url.username) : undefined,
        password: url.password ? decodeURIComponent(url.password) : undefined,
        ssl: { rejectUnauthorized: false },
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
        extra: { options: options.join(' ') },
      };
  },
});