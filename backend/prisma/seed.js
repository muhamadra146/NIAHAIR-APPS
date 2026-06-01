require("dotenv").config();

const { PrismaClient } =
    require("@prisma/client");

const { PrismaPg } =
    require("@prisma/adapter-pg");

const bcrypt =
    require("bcrypt");


const adapter =
    new PrismaPg({

        connectionString:
            process.env.DATABASE_URL

    });


const prisma =
    new PrismaClient({

        adapter

    });


async function main() {


    console.log("Start seed...");


    // =========================
    // USER ROLE
    // =========================

    const superAdminRole =
        await prisma.userRole.upsert({

            where: {

                code:
                    "SUPER_ADMIN"

            },


            update: {},


            create: {

                code:
                    "SUPER_ADMIN",

                name:
                    "Super Admin",

                isActive:
                    true

            }

        });


    // =========================
    // PASSWORD
    // =========================


    const passwordHash =
        await bcrypt.hash(
            "123456",
            10
        );



    // =========================
    // USER
    // =========================


    await prisma.user.upsert({

        where: {

            email:
                "admin@niahair.com"

        },


        update: {},


        create: {


            name:
                "Super Admin",


            email:
                "admin@niahair.com",


            passwordHash:
                passwordHash,


            userRoleId:
                superAdminRole.id,


            isActive:
                true

        }

    });



    console.log(
        "Seed completed"
    );


}



main()

    .catch((error)=>{

        console.error(error);

        process.exit(1);

    })


    .finally(async()=>{

        await prisma.$disconnect();

    });