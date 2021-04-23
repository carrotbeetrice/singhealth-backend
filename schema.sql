create table if not exists "Institutions"
(
    "InstitutionId"   serial       not null
        constraint "Institutions_pk"
            primary key,
    "InstitutionName" varchar(255) not null,
    "Abbreviation"    varchar(25)
);

create table if not exists "UserRoles"
(
    "RoleId" serial not null
        constraint "UserRoles_pk"
            primary key,
    "Name"   varchar(255)
);

create table if not exists "Users"
(
    "UserId"   serial       not null
        constraint "Users_pk"
            primary key,
    "UserName" varchar(255) not null,
    "Hash"     varchar(255) not null,
    "Email"    varchar(255) not null,
    "RoleId"   integer      not null
        constraint "Users_fk0"
            references "UserRoles"
);

create table if not exists "ChecklistTypes"
(
    "TypeId"        serial       not null
        constraint "ChecklistTypes_pk"
            primary key,
    "ChecklistName" varchar(255) not null
);

create table if not exists "Images"
(
    "ImageId"    serial       not null
        constraint "Images_pk"
            primary key,
    "ImageKey"   varchar(255) not null,
    "UploadedOn" date         not null
);

create table if not exists "OutletTypes"
(
    "TypeId"   serial       not null
        constraint "OutletTypes_pk"
            primary key,
    "TypeName" varchar(255) not null
);

create table if not exists "RetailOutlets"
(
    "OutletId"      serial       not null
        constraint "RetailOutlets_pk"
            primary key,
    "OutletName"    varchar(255) not null,
    "TenantId"      bigint       not null
        constraint "RetailOutlets_fk0"
            references "Users",
    "UnitNumber"    varchar(100) not null,
    "TenancyStart"  date         not null,
    "TenancyEnd"    date         not null,
    "InstitutionId" integer
        constraint retailoutlets_fk1
            references "Institutions",
    "OutletType"    integer
        constraint "RetailOutlets_fk2"
            references "OutletTypes"
);

create table if not exists "Reports"
(
    "ReportId"         serial  not null
        constraint "Reports_pk"
            primary key,
    "AuditorId"        serial  not null
        constraint "Reports_fk0"
            references "Users",
    "OutletId"         integer not null
        constraint "Reports_fk1"
            references "RetailOutlets",
    "Score"            integer not null,
    "CreatedOn"        date    not null,
    "ReportType"       integer
        constraint "Reports_fk2"
            references "ChecklistTypes",
    "ChecklistAnswers" jsonb,
    "Comments"         varchar
);

create table if not exists "ReportImages"
(
    "ReportId" bigint not null
        constraint "ReportImages_fk0"
            references "Reports",
    "ImageId"  bigint not null
        constraint "ReportImages_fk1"
            references "Images"
);

create table if not exists "ChecklistCategories"
(
    "CategoryId"      serial       not null
        constraint "ChecklistCategories_pk"
            primary key,
    "CategoryName"    varchar(255) not null,
    "ChecklistTypeId" integer      not null
        constraint "ChecklistCategories_fk0"
            references "ChecklistTypes",
    "Weightage"       integer      not null
);

create table if not exists "ChecklistSubCategories"
(
    "SubcategoryId"   serial       not null
        constraint "ChecklistSubCategories_pk"
            primary key,
    "SubcategoryName" varchar(255) not null,
    "CategoryId"      integer      not null
        constraint "ChecklistSubCategories_fk0"
            references "ChecklistCategories"
);

create table if not exists "DefaultChecklistQuestions"
(
    "QuestionId"    serial       not null
        constraint "DefaultChecklistQuestions_pk"
            primary key,
    "Question"      varchar(255) not null,
    "CategoryId"    integer
        constraint "DefaultChecklistQuestions_fk1"
            references "ChecklistCategories",
    "SubcategoryId" integer
        constraint "DefaultChecklistQuestions_fk0"
            references "ChecklistSubCategories"
);

create table if not exists "NonComplianceLog"
(
    "OriginalReportId" bigint                not null
        constraint "NonComplianceLog_fk0"
            references "Reports",
    "ResolveByDate"    date                  not null,
    "IsResolved"       boolean default false not null,
    "ResolvedOn"       date,
    "ReportedDate"     date,
    "NonComplianceId"  serial                not null
        constraint "NonComplianceLog_pkey"
            primary key
);

create table if not exists "RectificationLog"
(
    "RectificationId" serial not null
        constraint "RectificationLog_pk"
            primary key,
    "NonComplianceId" integer
        constraint "RectificationLog_fk0"
            references "NonComplianceLog",
    "Comments"        varchar
);

create table if not exists "RectificationImages"
(
    "RectificationId" bigint not null
        constraint "RectificationImages_fk0"
            references "RectificationLog",
    "ImageId"         bigint not null
        constraint "RectificationImages_fk1"
            references "Images"
);

create table if not exists "StaffInstitutions"
(
    staffid       integer,
    institutionid integer
);

create function getquestionsbysubcategory(paramsubcategoryid integer)
    returns TABLE
            (
                subcategory   character varying,
                questionsjson json
            )
    language plpgsql
as
$$
begin
    return query select CSC."SubcategoryName",
                        json_agg(
                                row_to_json((
                                    select SN
                                    from (
                                             select DCQ."QuestionId" as id,
                                                    DCQ."Question"   as question
                                         )
                                             as SN)
                                    )
                            ) questions
                 from "ChecklistSubCategories" CSC
                          inner join "DefaultChecklistQuestions" DCQ on CSC."SubcategoryId" = DCQ."SubcategoryId"
                 where CSC."SubcategoryId" = paramSubCategoryId
                 group by CSC."SubcategoryName";
end;
$$;

create function getquestionsbycategory(paramcategoryid integer)
    returns TABLE
            (
                category      character varying,
                subcategories json,
                weightage     integer
            )
    language plpgsql
as
$$
begin
    return query select CC."CategoryName",
                        json_agg(
                                row_to_json((
                                    select SN
                                    from (
                                             select subcategory,
                                                    questionsjson as questions
                                             from getquestionsbysubcategory("SubcategoryId")
                                             where "SubcategoryId" is not null
                                         ) as SN)
                                    )
                            ) as Subcategories,
                        CC."Weightage"
                 from "ChecklistCategories" CC
                          inner join "ChecklistSubCategories" CSC on CC."CategoryId" = CSC."CategoryId"
                 where CC."CategoryId" = paramcategoryid
                 group by CC."CategoryName", CC."Weightage";
end;
$$;

create function getchecklistquestions(paramchecklisttypeid integer)
    returns TABLE
            (
                checklistquestions json
            )
    language plpgsql
as
$$
begin
    return query select json_agg(
                                row_to_json((
                                    select _
                                    from (
                                             select *
                                             from getquestionsbycategory(CC."CategoryId")
                                             where "CategoryId" is not null
                                         ) as _
                                ))
                            )
                 from "ChecklistCategories" CC
                          inner join "ChecklistTypes" CT on CT."TypeId" = CC."ChecklistTypeId"
                 where "TypeId" = paramChecklistTypeId;
end;
$$;

create function getnccount(paramauditorid integer)
    returns TABLE
            (
                noncompliances bigint,
                datetruncmonth timestamp with time zone
            )
    language plpgsql
as
$$
begin
    return query select count("NonComplianceId"),
                        date_trunc('month', "ReportedDate")
                 from "NonComplianceLog"
                          inner join "Reports" R on R."ReportId" = "NonComplianceLog"."OriginalReportId"
                          inner join "RetailOutlets" RO on RO."OutletId" = R."OutletId"
                 where RO."InstitutionId" in
                       (select institutionid from "StaffInstitutions" where staffid = paramAuditorId)
                 group by date_trunc('month', "ReportedDate")
                 order by date_trunc('month', "ReportedDate") desc
                 limit 2;
end;
$$;

create function getunresolvedncs(paramtenantid integer)
    returns TABLE
            (
                ncid       integer,
                reporttype character varying,
                outletid   integer,
                outletname character varying,
                deadline   text,
                auditedby  character varying
            )
    language plpgsql
as
$$
begin
    return query select "NonComplianceId",
                        CT."ChecklistName",
                        RO."OutletId",
                        "OutletName",
                        to_char("ResolveByDate", 'YYYY-MM-DD'),
                        "UserName" as AuditorName
                 from "NonComplianceLog"
                          inner join "Reports" R on R."ReportId" = "NonComplianceLog"."OriginalReportId"
                          inner join "RetailOutlets" RO on RO."OutletId" = R."OutletId"
                          inner join "Users" U on U."UserId" = R."AuditorId"
                          inner join "Institutions" I on I."InstitutionId" = RO."InstitutionId"
                          inner join "ChecklistTypes" CT on R."ReportType" = CT."TypeId"
                 where "TenantId" = paramTenantId
                   and "IsResolved" = false;
end;
$$;

create function getfulltenantreport(paramreportid integer)
    returns TABLE
            (
                reportid          integer,
                auditorid         integer,
                auditorname       character varying,
                outletid          integer,
                outletname        character varying,
                outlettype        character varying,
                tenantemail       character varying,
                institution       character varying,
                checklisttype     character varying,
                checklistscore    integer,
                checklistcontents jsonb,
                reportedon        text
            )
    language plpgsql
as
$$
begin
    return query select R."ReportId",
                        R."AuditorId",
                        U."UserName",
                        R."OutletId",
                        RO."OutletName",
                        OT."TypeName",
                        (select "Email" from "Users" where RO."TenantId" = "UserId") as "TenantEmail",
                        I."InstitutionName",
                        CT."ChecklistName",
                        "Score",
                        "ChecklistAnswers",
                        to_char("CreatedOn", 'YYYY-MM-DD')                           as "ReportDate"
                 from "Reports" R
                          inner join "RetailOutlets" RO on RO."OutletId" = R."OutletId"
                          inner join "Users" U on U."UserId" = R."AuditorId"
                          inner join "OutletTypes" OT on OT."TypeId" = RO."OutletType"
                          inner join "Institutions" I on I."InstitutionId" = RO."InstitutionId"
                          inner join "ChecklistTypes" CT on OT."TypeId" = CT."TypeId"
                 where R."ReportId" = paramReportId;
end;
$$;

create function getreceiverinfo(paramreportid integer)
    returns TABLE
            (
                tenantid   bigint,
                email      character varying,
                name       character varying,
                outletid   integer,
                outletname character varying,
                reporttype character varying
            )
    language plpgsql
as
$$
begin
    return query select RO."TenantId",
                        U."Email",
                        U."UserName",
                        RO."OutletId",
                        RO."OutletName",
                        "ChecklistName"
                 from "Reports"
                          inner join "RetailOutlets" RO on RO."OutletId" = "Reports"."OutletId"
                          inner join "ChecklistTypes" CT on "ReportType" = CT."TypeId"
                          inner join "Users" U on U."UserId" = RO."TenantId"
                 where "ReportId" = paramReportId;
end;
$$;

create function getinstitutionscores(paramstaffid integer)
    returns TABLE
            (
                outletid   integer,
                outletname character varying,
                reporttype character varying,
                score      integer,
                reportedon text
            )
    language plpgsql
as
$$
begin
    return query select RO."OutletId",
                        RO."OutletName",
                        CT."ChecklistName",
                        "Score",
                        to_char("CreatedOn", 'YYYY-MM-DD')
                 from "Reports"
                          inner join "RetailOutlets" RO on RO."OutletId" = "Reports"."OutletId"
                          inner join "ChecklistTypes" CT on CT."TypeId" = "ReportType"
                 where RO."InstitutionId" in
                       (select institutionid from "StaffInstitutions" where staffid = paramStaffId)
                   and extract(month from "CreatedOn") = extract(month from now())
                 order by "CreatedOn" desc;
end;
$$;

create function getnoncompliancereportrecords(paramauditorid integer)
    returns TABLE
            (
                reportid     bigint,
                reporttype   text,
                outletid     integer,
                outletname   character varying,
                score        integer,
                reporteddate text,
                isresolved   boolean
            )
    language plpgsql
as
$$
begin
    return query select "OriginalReportId",
                        concat("ChecklistName", ' Checklist'),
                        R."OutletId",
                        RO."OutletName",
                        R."Score",
                        to_char("ReportedDate", 'YYYY-MM-DD'),
                        "IsResolved"
                 from "NonComplianceLog"
                          inner join "Reports" R on R."ReportId" = "NonComplianceLog"."OriginalReportId"
                          inner join "RetailOutlets" RO on RO."OutletId" = R."OutletId"
                          inner join "ChecklistTypes" CT on CT."TypeId" = R."ReportType"
                 where RO."InstitutionId" in
                       (select institutionid from "StaffInstitutions" where staffid = paramAuditorId)
                 order by "ReportedDate" desc
                 limit 10;
end;
$$;

create function getoutletscoresbymonth(paramauditorid integer, paramdaterange timestamp with time zone)
    returns TABLE
            (
                reportid    integer,
                reporttype  character varying,
                outletid    integer,
                outletname  character varying,
                score       integer,
                reportedon  text,
                auditorid   integer,
                auditorname character varying
            )
    language plpgsql
as
$$
begin
    return query select "ReportId",
                        "ChecklistName",
                        RO."OutletId",
                        "OutletName",
                        "Score",
                        to_char("CreatedOn", 'YYYY-MM-DD'),
                        "AuditorId",
                        U."UserName"
                 from "Reports"
                          inner join "ChecklistTypes" CT on CT."TypeId" = "ReportType"
                          inner join "RetailOutlets" RO on RO."OutletId" = "Reports"."OutletId"
                          inner join "Users" U on U."UserId" = "Reports"."AuditorId"
                 where RO."InstitutionId" in
                       (select institutionid from "StaffInstitutions" where staffid = paramAuditorId)
                   and extract(month from "CreatedOn") = extract(month from paramDateRange)
                   and extract(year from "CreatedOn") = extract(year from paramDateRange)
                 order by "CreatedOn" desc;
end;
$$;

create function getmonthlyscoresbyreporttype(paramauditorid integer, paramdaterange timestamp with time zone)
    returns TABLE
            (
                typeid     integer,
                reporttype character varying,
                scores     json
            )
    language plpgsql
as
$$
begin
    return query select "TypeId",
                        "ChecklistName",
                        json_agg(
                                row_to_json((
                                    select _
                                    from (
                                             select "Score" as score
                                         ) as _
                                ))
                            ) scores
                 from "Reports"
                          inner join "RetailOutlets" RO on RO."OutletId" = "Reports"."OutletId"
                          inner join "ChecklistTypes" CT on CT."TypeId" = "Reports"."ReportType"
                 where "InstitutionId" in (select institutionid from "StaffInstitutions" where staffid = paramAuditorId)
                   and extract(month from "CreatedOn") = extract(month from paramDateRange)
                 group by "TypeId";
end;
$$;

create function getalloutlets(paraminstitutionid integer)
    returns TABLE
            (
                outletid       integer,
                outletname     character varying,
                outlettypeid   integer,
                outlettypename character varying,
                unitnumber     character varying,
                tenantid       bigint,
                tenancystart   text,
                tenancyend     text,
                institutionid  integer
            )
    language plpgsql
as
$$
begin
    return query select R."OutletId",
                        R."OutletName",
                        "TypeId",
                        "TypeName",
                        R."UnitNumber",
                        "TenantId",
                        to_char(R."TenancyStart", 'YYYY-MM-DD') as "tenancyStart",
                        to_char(R."TenancyEnd", 'YYYY-MM-DD')   as "tenancyEnd",
                        I."InstitutionId"
                 from "RetailOutlets" R
                          join "Users" U on U."UserId" = R."TenantId"
                          join "Institutions" I on I."InstitutionId" = R."InstitutionId"
                          join "OutletTypes" OT on OT."TypeId" = R."OutletType"
                 where R."InstitutionId" = paramInstitutionId
                 order by "OutletId";
end;
$$;

create function getmonthlynoncompliancesbyinstitution(paramauditorid integer)
    returns TABLE
            (
                totalnoncompliances integer,
                unresolvedcount     integer
            )
    language plpgsql
as
$$
declare
    total           bigint;
    unresolvedCount bigint;
begin
    select count("OriginalReportId")
    from "Reports"
             inner join "RetailOutlets" RO on RO."OutletId" = "Reports"."OutletId"
             inner join "Institutions" I on RO."InstitutionId" = I."InstitutionId"
             left join "NonComplianceLog" NCL on "Reports"."ReportId" = NCL."OriginalReportId"
    where RO."InstitutionId" in (select institutionid from "StaffInstitutions" where staffid = paramAuditorId)
      and extract(month from "CreatedOn") = extract(month from now())
    into total;

    select count("OriginalReportId")
    from "Reports"
             inner join "RetailOutlets" RO on RO."OutletId" = "Reports"."OutletId"
             inner join "Institutions" I on RO."InstitutionId" = I."InstitutionId"
             inner join "NonComplianceLog" NCL on "Reports"."ReportId" = NCL."OriginalReportId"
    where RO."InstitutionId" in (select institutionid from "StaffInstitutions" where staffid = paramauditorid)
      and ("IsResolved" = false)
      and extract(month from "CreatedOn") = extract(month from now())
    into unresolvedCount;

    drop table if exists "NoncomplianceData";
    create temporary table "NoncomplianceData"
    (
        totalNonCompliances int,
        unsresolvedCount    int
    );

    insert into "NoncomplianceData" (totalNonCompliances, unsresolvedCount) values (total, unresolvedCount);

    return query select * from "NoncomplianceData";

    drop table "NoncomplianceData";

end;
$$;

create function getncreport(paramreportid integer)
    returns TABLE
            (
                reportid    integer,
                reporttype  character varying,
                outletid    integer,
                outletname  character varying,
                score       integer,
                reportedon  text,
                resolveby   text,
                auditorname character varying,
                comments    character varying
            )
    language plpgsql
as
$$
begin
    return query select "ReportId",
                        CT."ChecklistName",
                        RO."OutletId",
                        "OutletName",
                        "Score",
                        to_char("ReportedDate", 'YYYY-MM-DD'),
                        to_char("ResolveByDate", 'YYYY-MM-DD'),
                        "UserName",
                        "Comments"
                 from "NonComplianceLog"
                          inner join "Reports" R on R."ReportId" = "NonComplianceLog"."OriginalReportId"
                          inner join "RetailOutlets" RO on RO."OutletId" = R."OutletId"
                          inner join "Users" U on U."UserId" = R."AuditorId"
                          inner join "Institutions" I on I."InstitutionId" = RO."InstitutionId"
                          inner join "ChecklistTypes" CT on R."ReportType" = CT."TypeId"
                 where "ReportId" = paramReportId;
end;
$$;

