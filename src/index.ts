const Fastify = require("fastify");

const { Client } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const fastifyCors = require("@fastify/cors");
const fastifyFormbody = require("./fastifyFormBody");

const fastify = Fastify({});

fastify.register(fastifyFormbody);

const client = new Client({
  user: "postgres",
  host: "localhost",
  database: "sunrise",
  password: "rlafuaud",
  port: 5432,
});
client.connect().then(() => console.log("postgreSql is connected..."));
fastify.register(fastifyCors, { origin: "*" });

fastify.post("/auth/register", (req: any, reply: any) => {
  client.query(
    "select email from users.users where email=$1",
    [req.body.email],
    function onResult(err: any, result: any) {
      if (!result.rows.length) {
        let admin: Number = 0;
        if (req.body.email == "sunrise96208@gmail.com") {
          admin = 1;
        }
        bcrypt.genSalt(10, function (err: any, salt: String) {
          bcrypt.hash(
            req.body.password,
            salt,
            function (err: any, hash: String) {
              client.query(
                "INSERT INTO users.users (name, email, password, admin) VALUES($1, $2, $3, $4) RETURNING '*'",
                [req.body.name, req.body.email, hash, admin],
                function onResult(err: any, result: any) {
                  return reply.code(200).send({
                    success: true,
                    result,
                  });
                }
              );
            }
          );
        });
      } else {
        return reply.send({ success: false, msg: "email already exists..." });
      }
    }
  );
});

fastify.post("/auth/login", (req: any, reply: any) => {
  client.query(
    "select * from users.users where email=$1",
    [req.body.email],
    function onResult(err: any, result: any) {
      if (result.rows.length) {
        bcrypt.compare(
          req.body.password,
          result.rows[0].password,
          function (err: any, res: any) {
            if (res) {
              const loginUser = {
                name: result.rows[0].name,
                email: result.rows[0].email,
                admin: result.rows[0].admin,
              };
              jwt.sign(
                loginUser,
                "sunrise96208@gmail.com",
                { expiresIn: 60 * 60 },
                function (err: any, token: String) {
                  return reply.send({ success: true, token });
                }
              );
            } else {
              return reply.send({
                success: false,
                msg: "password incorrect.",
              });
            }
          }
        );
      } else {
        return reply.send({ success: false, msg: "email doesn't exists." });
      }
    }
  );
});

fastify.get("/auth", (req: any, reply: any) => {
  client.query(
    "select * from users.users",
    function onResult(err: any, result: any) {
      return reply.send({ users: result.rows });
    }
  );
});

fastify.put("/auth/update_admin", (req: any, reply: any) => {
  client.query(
    "update users.users set admin=$1 where id=$2",
    [req.body.admin, req.body.id],
    function onResult(err: any, result: any) {
      return reply.send({ users: result.rows });
    }
  );
});

try {
  fastify.listen({ port: 5000 }, () =>
    console.log("fastify server is running on port 5000...")
  );
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
