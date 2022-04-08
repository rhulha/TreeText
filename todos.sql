create table todos (
    id serial primary key,
    parent int,
    folder boolean default false,
    weight serial,
    text varchar(1024),
    starred boolean default false,
    due timestamp,
    remindme timestamp,
    completed timestamp,
    created timestamp default now(),
    modified timestamp default now()
);
