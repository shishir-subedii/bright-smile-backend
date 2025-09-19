import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from 'src/database/persistence/persistence.module';
import { UsersModule } from 'src/user/user.module';

@Global() // makes it available everywhere without importing repeatedly
@Module({
    imports: [
        PersistenceModule,
        UsersModule,
    ],
    exports: [PersistenceModule, UsersModule], // so other modules can use them
})
export class CoreModule { }
