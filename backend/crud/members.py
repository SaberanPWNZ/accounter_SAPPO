"""CRUD operations for Member."""

from sqlalchemy.orm import Session

from models import Member
from schemas import MemberCreate, MemberUpdate


def get_members(db: Session, account_id: int) -> list[Member]:
    return (
        db.query(Member)
        .filter(Member.account_id == account_id)
        .order_by(Member.name)
        .all()
    )


def create_member(db: Session, account_id: int, data: MemberCreate) -> Member:
    member = Member(
        account_id=account_id,
        name=data.name,
        card_number=data.card_number,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def delete_member(db: Session, member_id: int) -> bool:
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        return False
    db.delete(member)
    db.commit()
    return True


def update_member(db: Session, member_id: int, data: MemberUpdate) -> Member | None:
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        return None
    member.name = data.name
    member.card_number = data.card_number
    db.commit()
    db.refresh(member)
    return member
