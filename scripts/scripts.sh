#!/bin/bash

DIR_PATH=$(dirname "$0")
ANONDB_DIR=anonyymioodi
BACKUP_DIR=backups

PSQL_DB_BACKUP="$ANONDB_DIR/anon.sqz"
USER_DB_BACKUP="$ANONDB_DIR/user-dump.sqz"
KONE_DB_BACKUP="$ANONDB_DIR/anon_kone.sqz"
ANALYTICS_DB_BACKUP="$ANONDB_DIR/analytics-dump.sqz"

PSQL_REAL_DB_BACKUP="$BACKUP_DIR/latest-pg.sqz"
KONE_REAL_DB_BACKUP="$BACKUP_DIR/latest-kone-pg.sqz"
USER_REAL_DB_BACKUP="$BACKUP_DIR/latest-user-pg.sqz"
ANALYTICS_REAL_DB_BACKUP="$BACKUP_DIR/latest-analytics-pg.sqz"

docker-compose-dev () {
    docker-compose -f docker-compose.yml -f ./docker/docker-compose.dev.yml "$@"
}

retry () {
    for i in {1..60}
    do
        $@ && break || echo "Retry attempt $i failed, waiting..." && sleep 10;
    done
}

init_dirs () {
    mkdir -p $BACKUP_DIR nginx nginx/cache nginx/letsencrypt
    touch nginx/error.log
    touch nginx/log
}

echo_path () {
    echo $(pwd)
}

get_oodikone_server_backup() {
    echo "Enter your Uni Helsinki username:"
    read username
    scp -r -o ProxyCommand="ssh -l $username -W %h:%p melkinpaasi.cs.helsinki.fi" $username@oodikone.cs.helsinki.fi:/home/tkt_oodi/backups/* "$BACKUP_DIR/"
    scp -r -o ProxyCommand="ssh -l $username -W %h:%p melkinpaasi.cs.helsinki.fi" $username@svm-77.cs.helsinki.fi:/home/tkt_oodi/backups/* "$BACKUP_DIR/"
}

get_anon_oodikone() {
    rm -rf anonyymioodi
    git clone --depth=1 git@github.com:UniversityOfHelsinkiCS/anonyymioodi.git
}

restore_psql_from_backup () {
    docker cp $1 $2:/asd.sqz
    docker exec $2 pg_restore -U postgres --no-owner -F c --dbname=$3 -j4 /asd.sqz
}

ping_psql () {
    drop_psql $1 $2
    echo "Creating psql in container $1 with db name $2"
    retry docker exec -u postgres $1 pg_isready --dbname=$2
    docker exec -u postgres $1 psql -c "CREATE DATABASE $2" || echo "container $1 DB $2 already exists"
}

drop_psql () {
    echo "Dropping psql in container $1 with db name $2"
    retry docker exec -u postgres $1 pg_isready --dbname=$2
    docker exec -u postgres $1 psql -c "DROP DATABASE $2" || echo "container $1 DB $2 doesn't exists"
}

db_setup_full () {
    echo "Restoring PostgreSQL from backup"
    ping_psql "oodi_db" "tkt_oodi_real"
    restore_psql_from_backup $PSQL_REAL_DB_BACKUP oodi_db tkt_oodi_real
    ping_psql "db_kone" "db_kone_real"
    restore_psql_from_backup $KONE_REAL_DB_BACKUP db_kone db_kone_real
    ping_psql "oodi_user_db" "user_db_real"
    restore_psql_from_backup $USER_REAL_DB_BACKUP oodi_user_db user_db_real
    ping_psql "oodi_analytics_db" "analytics_db_real"
    restore_psql_from_backup $ANALYTICS_REAL_DB_BACKUP oodi_analytics_db analytics_db_real
    # echo "Restoring MongoDB from backup"
    # retry restore_mongodb_from_backup
    echo "Database setup finished"
}

db_anon_setup_full () {
    echo "Restoring PostgreSQL from backup"
    ping_psql "oodi_db" "tkt_oodi"
    ping_psql "oodi_db" "tkt_oodi_test"
    restore_psql_from_backup $PSQL_DB_BACKUP oodi_db tkt_oodi

    ping_psql "db_kone" "db_kone"
    ping_psql "db_kone" "db_kone_test"
    restore_psql_from_backup $KONE_DB_BACKUP db_kone db_kone

    ping_psql "oodi_user_db" "user_db"
    restore_psql_from_backup $USER_DB_BACKUP oodi_user_db user_db

    ping_psql "oodi_analytics_db" "analytics_db"
    restore_psql_from_backup $ANALYTICS_DB_BACKUP oodi_analytics_db analytics_db
    # echo "Restoring MongoDB from backup"
    # retry restore_mongodb_from_backup
    echo "Database setup finished"
}

reset_real_db () {
    docker-compose-dev down
    docker-compose-dev up -d db user_db db_kone analytics_db
    db_setup_full
    docker-compose-dev down
}

reset_db () {
    docker-compose-dev down
    docker-compose-dev up -d db user_db db_kone analytics_db
    db_anon_setup_full
    docker-compose-dev down
}

reset_db_for_cypress () {
    # stop any service with connections to DB
    docker-compose stop backend updater_writer
    db_anon_setup_full
    # restart services, run migrations
    docker-compose restart backend updater_writer
    # wait until backend is up
    retry curl --silent --fail localhost:8080/ping
}

install_cli_npm_packages () {
    npm ci
}

show_instructions () {
    cat ./scripts/assets/instructions.txt
}

run_full_setup () {
    echo "Setup npm packages"
    install_cli_npm_packages
    echo "Init dirs"
    init_dirs
    echo "Getting backups from the Oodikone server, this will prompt you for your password. "
    get_oodikone_server_backup
    echo "Getting anon backups from the private repository. "
    get_anon_oodikone
    echo "Building images"
    docker-compose-dev build
    echo "Setup oodikone db from dump."
    docker-compose-dev up -d db user_db db_kone analytics_db
    db_setup_full
    db_anon_setup_full
    docker-compose-dev down
    show_instructions
}

run_anon_full_setup () {
    echo "Setup npm packages"
    install_cli_npm_packages
    echo "Init dirs"
    init_dirs
    echo "Getting anon backups from the private repository. "

    if get_anon_oodikone ; then
        echo "Anon data fetched"
    else
        anon_data_error="Could not fetch anonyymioodi. Fetch the latest data with the CLI before running oodikone"
    fi
    
    echo "Building images"
    docker-compose-dev build
    echo "Setup oodikone db from dump."
    docker-compose-dev up -d db user_db db_kone analytics_db
    db_anon_setup_full
    docker-compose-dev down
    show_instructions
    if [[ ! -z anon_data_error ]] ; then
        tput setaf 1; echo "$anon_data_error"; tput sgr0
    fi
}
