from database import engine
from fastapi import FastAPI
from database import Base, engine, SessionLocal
from user import User
from fastapi import HTTPException

app = FastAPI()

Base.metadata.create_all(bind=engine)

@app.post("/register")
def test():
    db = SessionLocal()
    try:
        user = User(
            username = "Najad",
            email = "najadnabil@gmail.com",
            hashed_password = "Najad1000"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return {"message" : "User added successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail="Email exists currently.")
    finally:
        db.close()