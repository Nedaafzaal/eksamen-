create table eksamenSQL.bruger (
    brugerID int,
    porteføljeID int,
    brugernavn varchar(256),
    adgangskode varchar(256),
    email varchar(256),
    fødselsdato date,
    telefonnummer int,
    constraint PK_brugerID primary key (brugerID),
    constraint FK_porteføljeID foreign key (porteføljeID)
        references eksamenSQL.bruger(brugerID)
);

create table eksamenSQL.konto (
    kontoID int,
    brugerID int,
    kontonavn varchar(256),
    saldo decimal,
    valuta decimal,
    oprettelsesdato date,
    bankreference varchar(256),
    constraint PK_kontoID primary key (kontoID),
    constraint FK_brugerID foreign key (brugerID)
        references eksamenSQL.konto(kontoID)
);

create table eksamenSQL.transaktioner (
    transaktionID int,
    sælgerKontoID int,
    modtagerKontoId int,
    værditype varchar(256),
    dato date,
    tidspunkt time,
    transaktionstype varchar(256),
    pris decimal,
    gebyr decimal,
    constraint PK_transaktionID primary key (transaktionID),

    constraint FK_sælgerKontoID foreign key (sælgerKontoID)
        references eksamenSQL.konto(kontoID),

    constraint FK_modtagerKontoID foreign key (modtagerKontoID)
        references eksamenSQL.konto(kontoID)
);

create table eksamenSQL.værdipapir (
    værdipapirID int,
    transaktionID int,
    navn varchar(256),
    GAK decimal,
    forventetVærdi decimal,
    urealiseretPorteføljeGevinstTab decimal,
    constraint PK_værdipapirID primary key (værdipapirID),

    constraint FK_transaktionId foreign key (transaktionID)
        references eksamenSQL.transaktioner(transaktionID),
);

create table eksamenSQL.porteføljeVærdipapir (
    porteføljeVærdipapirID int,
    porteføljeID2 int,
    værdipapirID int,
    constraint PK_porteføljeVærdipapirID primary key (porteføljeVærdipapirID),

    constraint FK_porteføljeID2 foreign key (porteføljeID2)
        references eksamenSQL.porteføljer(porteføljeID),

    constraint FK_værdipapirID2 foreign key (værdipapirID)
        references eksamenSQL.værdipapir(værdipapirID)
);

create table eksamenSQL.porteføljer (
    porteføljeID int,
    værdipapirID int,
    navn varchar(256),
    kontotilknytning int,
    dato date,
    forventetVærdi decimal,
    værdipapirNavn varchar(256),
    constraint PK_porteføljeID primary key (porteføljeID),
    constraint FK_værdipapirID foreign key (værdipapirID)
        references eksamenSQL.værdipapir(værdipapirID)
);