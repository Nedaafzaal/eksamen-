import sql from 'mssql';

let database = null;

export default class Database {
    config = {};
    poolconnection = null;
    connected = false;

    constructor(config) {
        this.config = config;
    }

    async connect() {
        try {
            this.poolconnection = await sql.connect(this.config);
            this.connected = true;
            console.log('Database connected successfully');
        } catch (error) {
            console.error('Error connecting to the database:', error);
            this.connected = false;
        }
    }

    async disconnect() {
        try {
            if (this.connected) {
                await this.poolconnection.close();
                this.connected = false;
                console.log('Database disconnected successfully');
            }
        } catch (error) {
            console.error('Error disconnecting from the database:', error);
        }
    }

    async executeQuery(query) {
        const request = this.poolconnection.request();
        const result = await request.query(query);
        return result.rowsAffected[0];
    }

    async createTable() {
        try {
            await this.executeQuery(`
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'bruger')
                BEGIN

                CREATE TABLE eksamenSQL.bruger (
                    brugerID INT IDENTITY (1,1), --BETYDER AT VÆRDIEN ATUOMATISK STARTER VED 1 OG TÆLLER OP MED 1 FOR HVER NU RÆKKE
                    porteføljeID INT,
                    brugernavn VARCHAR(256),
                    adgangskode VARCHAR(256),
                    email VARCHAR(256),
                    fødselsdato DATE,
                    telefonnummer INT,
                    CONSTRAINT PK_brugerID PRIMARY KEY (brugerID),
                    CONSTRAINT FK_porteføljeID FOREIGN KEY (porteføljeID)
                    REFERENCES eksamenSQL.porteføljer(porteføljeID)
                    )   
    
                    END
                `);
                
            await this.executeQuery(`
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'konto')
                BEGIN
                CREATE TABLE eksamenSQL.konto (
                kontoID INT IDENTITY (1,1),
                brugerID INT,
                kontonavn VARCHAR(256),
                saldo DECIMAL,
                valuta VARCHAR,
                oprettelsesdato DATE,
                bankreference VARCHAR(256),
                CONSTRAINT PK_kontoID PRIMARY KEY (kontoID),
                CONSTRAINT FK_brugerID FOREIGN key (brugerID)
                REFERENCES eksamenSQL.bruger(brugerID)
                )
                END
                `);


            await this.executeQuery(`
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'transaktioner')
                BEGIN
                CREATE TABLE eksamenSQL.transaktioner (
                transaktionID INT IDENTITY (1,1),
                sælgerKontoID INT,
                modtagerKontoId INT,
                værditype VARCHAR(256),
                dato DATE,
                tidspunkt TIME,
                transaktionstype VARCHAR(256),
                pris DECIMAL,
                gebyr DECIMAL,
                CONSTRAINT PK_transaktionID PRIMARY KEY (transaktionID),

                CONSTRAINT FK_sælgerKontoID FOREIGN KEY (sælgerKontoID)
                REFERENCES eksamenSQL.konto(kontoID),

                CONSTRAINT FK_modtagerKontoID FOREIGN KEY (modtagerKontoID)
                REFERENCES eksamenSQL.konto(kontoID)
                )
                END
                `);

            await this.executeQuery(
                `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'værdipapir')
                BEGIN
                CREATE TABLE eksamenSQL.værdipapir (
                værdipapirID INT IDENTITY (1,1), 
                transaktionID INT,
                navn VARCHAR(256),
                GAK DECIMAL,
                forventetVærdi DECIMAL,
                urealiseretPorteføljeGevinstTab DECIMAL,
                CONSTRAINT PK_værdipapirID PRIMARY KEY (værdipapirID),

                CONSTRAINT FK_transaktionId FOREIGN KEY (transaktionID)
                REFERENCES eksamenSQL.transaktioner(transaktionID)
                )
                END
                `)

            await this.executeQuery(`
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'porteføljeVærdipapir')
                BEGIN
                CREATE TABLE eksamenSQL.porteføljeVærdipapir (
                porteføljeVærdipapirID INT IDENTITY (1,1),
                porteføljeID2 INT,
                værdipapirID INT,
                CONSTRAINT PK_porteføljeVærdipapirID PRIMARY KEY (porteføljeVærdipapirID),

                CONSTRAINT FK_porteføljeID2 FOREIGN KEY (porteføljeID2)
                REFERENCES eksamenSQL.porteføljer(porteføljeID),

                CONSTRAINT FK_værdipapirID2 FOREIGN KEY (værdipapirID)
                REFERENCES eksamenSQL.værdipapir(værdipapirID)
                )
                END
            
                `)

            await this.executeQuery(`
                IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'porteføljer')
                BEGIN
                CREATE TABLE eksamenSQL.porteføljer (
                porteføljeID INT IDENTITY (1,1),
                værdipapirID INT,
                navn VARCHAR(256),
                kontotilknytning INT,
                dato DATE,
                forventetVærdi DECIMAL,
                værdipapirNavn VARCHAR(256),
                CONSTRAINT PK_porteføljeID PRIMARY KEY (porteføljeID),
                CONSTRAINT FK_værdipapirID FOREIGN KEY (værdipapirID)
                REFERENCES eksamenSQL.værdipapir(værdipapirID)
                )
                END
                `)
            
            
            console.log('Table created');
        } catch (err) {
            console.error(`Error creating table: ${err}`);
        }
    }
}

export const createDatabaseConnection = async (passwordConfig) => {
    database = new Database(passwordConfig);
    await database.connect();
    await database.createTable();
    database.executeQuery('select *')
    return database;
};

