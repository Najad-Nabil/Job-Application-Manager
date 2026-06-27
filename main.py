from database import engine
from fastapi import FastAPI
from database import Base, engine
from user import User

app = FastAPI()

Base.metadata.create_all(bind=engine)

@app.get("/")
def test():
    connection = None
    try:
        connection = engine.connect()
        return {"message" : "Database connected successfully..."}
    except Exception as e:
        return {"message" : str(e)}
    finally:
        if connection:
            connection.close()

