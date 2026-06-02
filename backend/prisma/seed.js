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
    // EMPLOYEE ROLES
    // =========================

    const employeeRoles = [
        { code: "STYLIST",   name: "Stylist" },
        { code: "THERAPIST", name: "Therapist" },
        { code: "CASHIER",   name: "Cashier" },
        { code: "ADMIN",     name: "Admin" },
        { code: "MANAGER",   name: "Manager" },
    ];

    for (const role of employeeRoles) {
        await prisma.employeeRole.upsert({
            where:  { code: role.code },
            update: {},
            create: { code: role.code, name: role.name, isActive: true },
        });
    }

    console.log("Employee roles seeded");


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