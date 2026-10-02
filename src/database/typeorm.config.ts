import { lookup } from 'dns';
import { promisify } from 'util';

import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

export { ConfigModule, ConfigService };

const resolveIpv4 = promisify(lookup);

export const typeOrmModule = TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const databaseUrl = config.get<string>('DATABASE_URL');
    if (databaseUrl) {
      const url = new URL(databaseUrl);
      // Force IPv4: the pg driver keeps the first DNS answer, and on hosts
      // without working IPv6 connectivity that is a fast failure (ETIMEDOUT).
      // Neon requires SNI, so we keep the hostname for the TLS handshake and
      // only pin the resolved IPv4 address via the libpq `hostaddr` param.
      if (!url.searchParams.has('hostaddr')) {
        const ipv4 = await resolveIpv4(url.hostname, { type: 'A' });
        url.searchParams.set('hostaddr', ipv4);
      }
      return {
        type: 'postgres',
        url: url.toString(),
        ssl: { rejectUnauthorized: false },
        autoLoadEntities: true,
        synchronize: config.get('NODE_ENV') !== 'production',
        extra: { options: '-c timezone=UTC' },
      };
    }
    return {
      type: 'postgres',
      host: config.getOrThrow<string>('DATABASE_HOST'),
      port: config.get<number>('DATABASE_PORT') ?? 5432,
      database: config.getOrThrow<string>('DATABASE_NAME'),
      username: config.getOrThrow<string>('DATABASE_USER'),
      password: config.getOrThrow<string>('DATABASE_PASSWORD'),
      autoLoadEntities: true,
      synchronize: config.get('NODE_ENV') !== 'production',
      // Force the session timezone to UTC so timestamp round-trips are exact
      // regardless of the machine/DB timezone (classic TypeORM+pg pitfall:
      // local-time serialization vs session timezone corrupts Date columns).
      extra: { options: '-c timezone=UTC' },
    };
  },
});